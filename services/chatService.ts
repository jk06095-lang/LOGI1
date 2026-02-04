
import { db } from "../lib/firebase";
import { collection, addDoc, doc, query, where, orderBy, limit, limitToLast, onSnapshot, writeBatch, runTransaction, getDocs, arrayUnion, arrayRemove, setDoc, deleteDoc, updateDoc, startAfter } from "firebase/firestore";
import { ChatMessage, ChatUser } from "../types";

export const generateChannelId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
};

export const chatService = {
    subscribeChatMessages: (channelId: string, limitCount: number, callback: (messages: ChatMessage[]) => void) => {
        try {
            // OPTIMIZATION: Use limitToLast(n) + orderBy('timestamp', 'asc')
            // This fetches the *latest* n messages in correct chronological order directly from Firestore.
            // It avoids fetching old messages or sorting/reversing large arrays on the client.
            const q = query(
                collection(db, "messages"),
                where("channelId", "==", channelId),
                orderBy("timestamp", "asc"),
                limitToLast(limitCount)
            );

            return onSnapshot(q, (snapshot) => {
                const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
                callback(msgs);
            });
        } catch (e) {
            console.error("Chat Subscribe Error", e);
            return () => { };
        }
    },

    fetchHistoryMessages: async (channelId: string, lastTimestamp: number, limitCount: number = 50) => {
        try {
            const q = query(
                collection(db, "messages"),
                where("channelId", "==", channelId),
                orderBy("timestamp", "desc"), // Get older messages
                startAfter(lastTimestamp),
                limit(limitCount)
            );

            const snapshot = await getDocs(q);
            // Return in ascending order for the UI
            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage))
                .reverse();
        } catch (e) {
            console.error("Fetch History Error", e);
            return [];
        }
    },

    sendChatMessage: async (message: ChatMessage) => {
        const { id, pending, ...rest } = message;
        const messageData = Object.keys(rest).reduce((acc, key) => {
            const value = (rest as any)[key];
            if (value !== undefined) {
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, any>);

        const docRef = await addDoc(collection(db, "messages"), messageData);
        return docRef.id;
    },

    toggleMessageReaction: async (messageId: string, userId: string, emoji: string) => {
        const msgRef = doc(db, "messages", messageId);
        await runTransaction(db, async (transaction) => {
            const msgDoc = await transaction.get(msgRef);
            if (!msgDoc.exists()) return;

            const data = msgDoc.data() as ChatMessage;
            let reactions = data.reactions || [];

            const existingIdx = reactions.findIndex(r => r.emoji === emoji);

            if (existingIdx !== -1) {
                const reaction = reactions[existingIdx];
                if (reaction.userIds.includes(userId)) {
                    reaction.userIds = reaction.userIds.filter(uid => uid !== userId);
                    if (reaction.userIds.length === 0) {
                        reactions.splice(existingIdx, 1);
                    }
                } else {
                    reaction.userIds.push(userId);
                }
            } else {
                reactions.push({ emoji, userIds: [userId] });
            }

            transaction.update(msgRef, { reactions });
        });
    },

    markChannelRead: async (channelId: string, userId: string) => {
        // OPTIMIZATION: 
        // Firestore does NOT support filtering by "array-does-not-contain".
        // We must query recent messages and check `readBy` on the client side.
        // To minimize Write Costs, we limit this check to the latest 50 messages.
        // We only execute a Write Batch if we actually find messages that need updating.
        const qRecent = query(
            collection(db, "messages"),
            where("channelId", "==", channelId),
            orderBy("timestamp", "desc"),
            limit(50)
        );

        const snapshot = await getDocs(qRecent);
        const batch = writeBatch(db);
        let count = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const readBy = data.readBy || [];
            // Only update if user is NOT in the readBy array
            if (!readBy.includes(userId)) {
                batch.update(doc.ref, { readBy: arrayUnion(userId) });
                count++;
            }
        });

        if (count > 0) await batch.commit();
    },

    subscribeUnreadStatus: (userId: string, callback: (lastUnreadTs: number) => void) => {
        // Simplified unread tracking: listens to the absolute latest message in any channel.
        // A more robust system would require a dedicated 'user_notifications' collection.
        const q = query(
            collection(db, "messages"),
            orderBy("timestamp", "desc"),
            limit(1)
        );

        return onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const msg = snapshot.docs[0].data();
                callback(msg.timestamp);
            }
        });
    },

    subscribeChatUsers: (callback: (users: ChatUser[]) => void) => {
        const q = query(collection(db, "users"));
        return onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ChatUser));
            callback(users);
        });
    },

    addContactByEmail: async (myUid: string, email: string) => {
        const q = query(collection(db, "users"), where("email", "==", email));
        const snapshot = await getDocs(q);

        if (snapshot.empty) throw new Error("User not found");

        const targetUser = snapshot.docs[0];
        const targetUid = targetUser.id;

        if (targetUid === myUid) throw new Error("Cannot add yourself");

        await updateDoc(doc(db, "users", myUid), {
            contacts: arrayUnion(targetUid)
        });
    },

    removeContact: async (myUid: string, targetUid: string) => {
        await updateDoc(doc(db, "users", myUid), {
            contacts: arrayRemove(targetUid)
        });
    },

    sendTypingStatus: async (channelId: string, user: { uid: string, displayName: string }) => {
        const docRef = doc(db, "typing", `${channelId}_${user.uid}`);
        await setDoc(docRef, { ...user, channelId, timestamp: Date.now() });
    },

    clearTypingStatus: async (channelId: string, uid: string) => {
        await deleteDoc(doc(db, "typing", `${channelId}_${uid}`));
    },

    subscribeTyping: (channelId: string, callback: (users: any[]) => void) => {
        const q = query(collection(db, "typing"), where("channelId", "==", channelId));
        return onSnapshot(q, (snapshot) => {
            const now = Date.now();
            const users = snapshot.docs
                .map(doc => doc.data())
                .filter(data => now - data.timestamp < 5000);
            callback(users);
        });
    },

    subscribeUnreadMap: (userId: string, callback: (map: Set<string>) => void) => {
        // Listen to recent messages to detect unread status dynamically
        const q = query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(50));

        return onSnapshot(q, (snapshot) => {
            const map = new Set<string>();
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const isRelevant = data.channelId === 'global' || data.channelId.includes(userId);
                if (isRelevant && (!data.readBy || !data.readBy.includes(userId))) {
                    map.add(data.channelId);
                }
            });
            callback(map);
        });
    },

    getMessagesInTimeRange: async (start: number, end: number) => {
        const q = query(
            collection(db, "messages"),
            where("timestamp", ">=", start),
            where("timestamp", "<=", end),
            orderBy("timestamp", "asc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
    },

    deleteOldChatMessages: async (cutoffTimestamp: number) => {
        const q = query(
            collection(db, "messages"),
            where("timestamp", "<", cutoffTimestamp),
            limit(400)
        );
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        return snapshot.size;
    }
};
