import React, { useState, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import { useUIStore } from '../../../store/uiStore';
import { getToolboxStrings } from '../i18n';

interface HSCode {
    code: string;
    ko: string;
    en: string;
    keywords?: string[];
}

// Data with Keywords for Smart Search
const MARINE_HS_CODES: HSCode[] = [
    // [A] 선박 항법 및 통신 장비 (Navigation & Communication)
    { code: '8526.10', ko: '선박용 레이더 (Radar)', en: 'Radar Apparatus', keywords: ['radar', 'scanner', 'navigation', 'watch'] },
    { code: '9014.10', ko: '나침반/자이로컴퍼스', en: 'Direction finding compasses', keywords: ['compass', 'gyro', 'direction', 'north', 'heading'] },
    { code: '9014.80', ko: '소나/어군탐지기 (Echo Sounder)', en: 'Ultrasonic sounding or detecting apparatus', keywords: ['sonar', 'fish finder', 'depth', 'sounder', 'echo'] },
    { code: '9014.20', ko: '항공/우주 항행용 기기 (GPS 수신기)', en: 'Instruments for aeronautical/space (GPS)', keywords: ['gps', 'navigation', 'position', 'satellite'] },
    { code: '8517.62', ko: 'VHF/MF/HF 무선송수신기', en: 'Machines for the reception/transmission of voice', keywords: ['radio', 'vhf', 'communication', 'wireless', 'gmdss'] },
    { code: '8517.69', ko: 'AIS (선박자동식별장치)', en: 'Other apparatus for transmission', keywords: ['ais', 'identification', 'tracking', 'transponder'] },
    { code: '9015.80', ko: '스피드 로그 (선속계)', en: 'Speed indicators', keywords: ['log', 'speed', 'knot', 'velocity'] },
    { code: '8529.90', ko: '레이더/통신장비 부분품', en: 'Parts of Radar/Radio apparatus', keywords: ['parts', 'antenna', 'magnetron', 'spare'] },
    { code: '8525.89', ko: 'CCTV 카메라 (선박 보안용)', en: 'Television cameras', keywords: ['cctv', 'camera', 'security', 'video', 'surveillance'] },
    { code: '8544.49', ko: '통신 케이블 (선박용)', en: 'Electric conductors (Cables)', keywords: ['cable', 'wire', 'connect', 'ethernet'] },

    // [B] 선박 엔진 및 기계 부품 (Engine & Machinery Parts)
    { code: '8408.10', ko: '선박용 디젤 엔진 (추진용)', en: 'Marine Propulsion Engines', keywords: ['engine', 'diesel', 'propulsion', 'motor', 'main engine'] },
    { code: '8409.99', ko: '엔진 부품 - 피스톤/라이너', en: 'Parts of Marine Engines (Piston)', keywords: ['piston', 'liner', 'spare parts', 'cylinder', 'ring'] },
    { code: '8413.70', ko: '빌지/발라스트 펌프', en: 'Centrifugal pumps', keywords: ['pump', 'bilge', 'ballast', 'water', 'cooling'] },
    { code: '8414.80', ko: '공기 압축기 (Air Compressor)', en: 'Air compressors', keywords: ['compressor', 'air', 'pneumatic', 'control air'] },
    { code: '8421.23', ko: '오일 필터/청정기', en: 'Oil or petrol-filters', keywords: ['filter', 'purifier', 'oil', 'cleaner', 'strainer'] },
    { code: '8421.21', ko: '수처리 장치 (청수기)', en: 'Filtering or purifying machinery (Water)', keywords: ['water maker', 'purifier', 'fresh water', 'fwg'] },
    { code: '8481.80', ko: '밸브 (시수/유압)', en: 'Valves', keywords: ['valve', 'cock', 'pipe', 'fitting'] },
    { code: '8484.10', ko: '가스켓 (메탈/복합재질)', en: 'Gaskets and similar joints', keywords: ['gasket', 'seal', 'packing', 'joint', 'rubber'] },
    { code: '8482.10', ko: '볼 베어링', en: 'Ball bearings', keywords: ['bearing', 'roller', 'ball'] },
    { code: '8483.40', ko: '기어박스/감속기', en: 'Gear boxes', keywords: ['gear', 'transmission', 'speed reducer', 'clutch'] },
    { code: '8419.50', ko: '열교환기 (Heat Exchanger)', en: 'Heat exchange units', keywords: ['cooler', 'heater', 'exchanger', 'radiator'] },
    { code: '7304.31', ko: '무계목 강관 (파이프)', en: 'Seamless tubes/pipes of iron', keywords: ['pipe', 'tube', 'steel', 'fitting'] },

    // [C] 선체 의장 및 갑판 장비 (Deck & Hull)
    { code: '7316.00', ko: '닻(Anchor) 및 그 부분품', en: 'Anchors and grapnels', keywords: ['anchor', 'mooring', 'chain'] },
    { code: '7315.81', ko: '앵커 체인', en: 'Stud-link chain', keywords: ['chain', 'cable', 'mooring', 'link'] },
    { code: '8425.11', ko: '윈치 (전동식)', en: 'Winches (Electric)', keywords: ['winch', 'hoist', 'lifting', 'mooring'] },
    { code: '4016.94', ko: '방충재 (Fender)', en: 'Boat or dock fenders', keywords: ['fender', 'protection', 'rubber', 'bumper'] },
    { code: '7312.10', ko: '와이어 로프', en: 'Stranded wire, ropes', keywords: ['wire', 'rope', 'cable', 'steel'] },
    { code: '8539.51', ko: 'LED 투광기 (작업등/집어등)', en: 'LED Modules (Marine use)', keywords: ['light', 'lamp', 'led', 'floodlight', 'projector'] },
    { code: '9405.40', ko: '탐조등 (Searchlight)', en: 'Searchlights and spotlights', keywords: ['searchlight', 'spotlight', 'signal'] },
    { code: '3208.90', ko: '방오 도료 (A/F Paint)', en: 'Anti-fouling paints', keywords: ['paint', 'anti-fouling', 'coating', 'bottom'] },
    { code: '3208.10', ko: '방청 도료 (A/C Paint)', en: 'Paints based on polyesters', keywords: ['paint', 'anti-corrosive', 'primer', 'rust'] },
    { code: '7907.00', ko: '아연 판 (Zinc Anode)', en: 'Zinc anodes', keywords: ['zinc', 'anode', 'corrosion', 'protection', 'sacrificial'] },

    // [D] 선용품 및 소모품 (General Stores)
    { code: '2710.19', ko: '윤활유 (엔진오일/유압유)', en: 'Lubricating oils', keywords: ['oil', 'lube', 'grease', 'lubricant'] },
    { code: '3403.19', ko: '그리스 (Grease)', en: 'Lubricating preparations', keywords: ['grease', 'lubricant', 'nipple'] },
    { code: '4009.21', ko: '고무 호스 (금속보강)', en: 'Tubes/pipes of rubber', keywords: ['hose', 'tube', 'rubber', 'flexible'] },
    { code: '8204.11', ko: '스패너/렌치', en: 'Hand-operated spanners', keywords: ['spanner', 'wrench', 'tool', 'set'] },
    { code: '7318.15', ko: '볼트/너트 (철강제)', en: 'Screws and bolts', keywords: ['bolt', 'nut', 'screw', 'fastener', 'washer'] },
    { code: '3923.50', ko: '플라스틱 캡/마개', en: 'Stoppers/lids of plastics', keywords: ['cap', 'lid', 'stopper', 'plastic'] },

    // [E] 수산물 및 미끼 (Frozen Bait & Seafood)
    { code: '0303.54', ko: '냉동 고등어 (미끼용)', en: 'Frozen Mackerel (Bait)', keywords: ['mackerel', 'bait', 'fish', 'food'] },
    { code: '0303.53', ko: '냉동 정어리', en: 'Frozen Sardines', keywords: ['sardine', 'bait', 'fish', 'food'] },
    { code: '0307.43', ko: '냉동 오징어', en: 'Frozen Squid', keywords: ['squid', 'food', 'bait', 'calamari'] },
    { code: '0303.89', ko: '냉동 꽁치', en: 'Frozen Pacific saury', keywords: ['saury', 'fish', 'food', 'bait'] },
    { code: '0306.17', ko: '냉동 새우 (크릴)', en: 'Frozen Shrimps', keywords: ['shrimp', 'krill', 'food', 'prawn'] },
    { code: '0303.63', ko: '냉동 대구', en: 'Frozen Cod', keywords: ['cod', 'fish', 'food', 'fillet'] },
    { code: '0303.82', ko: '냉동 가다랑어', en: 'Frozen Skipjack tuna', keywords: ['tuna', 'skipjack', 'fish', 'bonito'] },

    // [F] 선원 생활용품 및 캐빈 스토어 (Cabin & Crew Stores)
    { code: '6302.21', ko: '침구류 (시트, 피복)', en: 'Bed linen of cotton', keywords: ['bed', 'sheet', 'linen', 'cover'] },
    { code: '6302.60', ko: '타월/수건', en: 'Toilet linen and kitchen linen', keywords: ['towel', 'cloth', 'bath'] },
    { code: '3401.11', ko: '비누 및 세면용품', en: 'Soap for toilet use', keywords: ['soap', 'toiletry', 'wash', 'body'] },
    { code: '3306.10', ko: '치약', en: 'Dentifrices (Toothpaste)', keywords: ['toothpaste', 'dental', 'care'] },
    { code: '9603.21', ko: '칫솔', en: 'Tooth brushes', keywords: ['toothbrush', 'oral'] },
    { code: '8212.10', ko: '면도기', en: 'Razors', keywords: ['razor', 'shaving', 'blade'] },
    { code: '4818.10', ko: '화장지 (롤 휴지)', en: 'Toilet paper', keywords: ['tissue', 'paper', 'toilet', 'roll'] },
    { code: '3402.20', ko: '주방/세탁 세제/디그리서', en: 'Cleaning & Washing preparations', keywords: ['detergent', 'cleaning', 'degreaser', 'powder'] },
    { code: '8215.99', ko: '식기류 (수저, 포크 등)', en: 'Tableware (Spoons, forks)', keywords: ['spoon', 'fork', 'cutlery', 'knife'] },
    { code: '6911.10', ko: '식기 (사기그릇)', en: 'Tableware of porcelain', keywords: ['plate', 'dish', 'bowl', 'ceramic'] },
    { code: '8418.69', ko: '선박용 냉장고/냉동고', en: 'Refrigerators/Freezers', keywords: ['fridge', 'freezer', 'galley'] },
    { code: '8516.71', ko: '전기 커피포트/메이커', en: 'Coffee makers', keywords: ['coffee', 'machine', 'galley', 'kettle'] },

    // [G] 개인 안전 장구 및 구호품 (Safety & PPE)
    { code: '6307.20', ko: '구명조끼 (Life Jacket)', en: 'Life-jackets and life-belts', keywords: ['lifejacket', 'vest', 'safety', 'saving'] },
    { code: '3926.90', ko: '구명환 (Life Buoy)', en: 'Life-buoys (Plastics)', keywords: ['buoy', 'ring', 'safety', 'throw'] },
    { code: '8424.10', ko: '소화기', en: 'Fire extinguishers', keywords: ['fire', 'extinguisher', 'safety', 'fighting'] },
    { code: '6211.33', ko: '작업복 (커버올)', en: 'Industrial workwear (Coveralls)', keywords: ['wear', 'clothes', 'work', 'coverall', 'boiler suit'] },
    { code: '6403.40', ko: '안전화', en: 'Safety footwear', keywords: ['shoes', 'boots', 'safety', 'toe'] },
    { code: '6506.10', ko: '안전모 (헬멧)', en: 'Safety headgear', keywords: ['helmet', 'hat', 'safety', 'hard'] },
    { code: '6116.10', ko: '안전 장갑 (코팅 장갑)', en: 'Safety gloves', keywords: ['glove', 'hand', 'protection', 'coating'] },
    { code: '9004.90', ko: '보호 고글', en: 'Safety spectacles (Goggles)', keywords: ['goggles', 'glasses', 'eye', 'protection'] },
    { code: '3006.50', ko: '구급함 (First-aid kits)', en: 'First-aid boxes and kits', keywords: ['medical', 'aid', 'kit', 'medicine'] },

    // [H] 원양어선 전문 어구 및 장비 (Professional Fishing Gear)
    { code: '5608.11', ko: '어망 (나일론/합성섬유제)', en: 'Made up fishing nets (Nylon)', keywords: ['net', 'fishing', 'nylon', 'mesh'] },
    { code: '5608.19', ko: '연승 어구 (모노라인/지선)', en: 'Longline fishing gear (Main/Branch line)', keywords: ['line', 'fishing', 'gear', 'longline'] },
    { code: '5607.50', ko: '로프 및 밧줄 (PP/PE/나일론)', en: 'Twine, cordage, ropes', keywords: ['rope', 'twine', 'cord', 'hawser'] },
    { code: '9507.20', ko: '낚싯바늘 (연승용/참치용)', en: 'Fish-hooks', keywords: ['hook', 'fishing', 'catch'] },
    { code: '9507.90', ko: '낚시용구 (도래, 봉돌, 인조미끼)', en: 'Line fishing tackle (Swivels, Sinkers, Lures)', keywords: ['tackle', 'lure', 'sinker', 'swivel'] },
    { code: '3926.90', ko: '어구용 부표/부이 (플라스틱 고압부이)', en: 'Fishing buoys/floats (Plastics)', keywords: ['buoy', 'float', 'marker'] },
    { code: '7020.00', ko: '유리 부표 (전통식)', en: 'Glass floats', keywords: ['float', 'glass', 'buoy'] },
    { code: '8526.91', ko: '라디오 부이 / GPS 부이', en: 'Radio navigational aid (GPS Buoy)', keywords: ['buoy', 'gps', 'radio', 'tracker'] },
    { code: '8425.31', ko: '양망기 / 양승기 (Net/Line Hauler)', en: 'Winches/Capstans for fishing', keywords: ['hauler', 'winch', 'net', 'lifter'] },
    { code: '8513.10', ko: '데크 작업등 / 헤드랜턴', en: 'Portable electric lamps (Headlamps)', keywords: ['lamp', 'light', 'lantern', 'head'] },
    { code: '8201.10', ko: '어처리용 칼 / 할복칼', en: 'Knives and cutting blades', keywords: ['knife', 'cutter', 'blade', 'processing'] },
    { code: '3923.10', ko: '어상자 (플라스틱 박스/채반)', en: 'Fish crates (Plastics)', keywords: ['box', 'crate', 'fish', 'basket'] },
    { code: '7312.10', ko: '강철제 와이어 로프 (트롤용)', en: 'Stranded wire, ropes (Iron/Steel)', keywords: ['wire', 'rope', 'trawl', 'steel'] },
    { code: '9014.80', ko: '어군 탐지기용 소나 센서', en: 'Echo sounder sensors/transducers', keywords: ['sonar', 'sensor', 'fish', 'transducer'] },
    { code: '4016.99', ko: '고무 롤러 (어구 보호용)', en: 'Rubber rollers for fishing', keywords: ['roller', 'rubber', 'protection', 'gear'] }
];

export const HSCodeSearch: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    React.useEffect(() => {
        const saved = localStorage.getItem('logi1-hscode-recent');
        if (saved) {
            try { setRecentSearches(JSON.parse(saved)); } catch (e) { }
        }
    }, []);

    // Localization
    const language = useUIStore((state) => state.settings.language);
    const t = getToolboxStrings(language);

    // Clipboard copy state
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const handleCopyCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(null), 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const saveSearch = (term: string) => {
        if (!term.trim()) return;
        const newRecent = [term, ...recentSearches.filter(t => t !== term)].slice(0, 5); // Keep last 5
        setRecentSearches(newRecent);
        localStorage.setItem('logi1-hscode-recent', JSON.stringify(newRecent));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            saveSearch(searchTerm);
        }
    };

    // Also save when clicking a result item if we want, but explicit Enter is safer for "Search Terms"

    const filteredCodes = useMemo(() => {
        if (!searchTerm.trim()) return MARINE_HS_CODES;

        const lowerTerm = searchTerm.toLowerCase().trim();

        return MARINE_HS_CODES.map(item => {
            let score = 0;

            // 1. Exact Code Start (Highest Priority)
            if (item.code.startsWith(lowerTerm)) score += 100;
            // 2. Exact Keyword Match
            if (item.ko.includes(searchTerm) || item.en.toLowerCase().includes(lowerTerm)) score += 50;
            // 3. Keyword/Related Match
            if (item.keywords?.some(k => k.includes(lowerTerm))) score += 30;
            // 4. Partial Match
            if (item.ko.includes(lowerTerm) || item.en.toLowerCase().includes(lowerTerm)) score += 10;

            return { ...item, score };
        })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score);

    }, [searchTerm]);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {/* Search Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/10">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">{t.hsCodeSearch}</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder={t.searchPlaceholder}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                    // AutoFocus removed here to prevent jumping if tab switch
                    />
                </div>
                <div className="flex items-center space-x-2 mt-2 text-xs text-gray-400 px-1 overflow-x-auto no-scrollbar">
                    <Filter size={10} />
                    <span className="shrink-0">{filteredCodes.length} {t.itemsFound}</span>
                    <span className="text-gray-300 shrink-0">|</span>

                    {/* Recent Searches */}
                    <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-gray-400 font-medium">{t.recent}</span>
                        {recentSearches.length > 0 ? (
                            recentSearches.map(term => (
                                <button
                                    key={term}
                                    onClick={() => setSearchTerm(term)}
                                    className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 transition-colors"
                                >
                                    {term}
                                </button>
                            ))
                        ) : (
                            <span className="text-gray-300 italic">{t.noRecentSearches}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                        <tr>
                            <th className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 w-24">{t.code}</th>
                            <th className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">{t.koreanDesc}</th>
                            <th className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">{t.englishDesc}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredCodes.length > 0 ? (
                            filteredCodes.map((item) => (
                                <tr key={item.code} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                                    <td
                                        className="px-5 py-3.5 font-bold text-blue-600 dark:text-blue-400 font-mono text-sm cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors relative"
                                        onClick={() => handleCopyCode(item.code)}
                                        title={language === 'ko' ? '클릭하여 복사' : 'Click to copy'}
                                    >
                                        {item.code}
                                        {copiedCode === item.code && (
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded animate-in fade-in zoom-in">
                                                {language === 'ko' ? '복사됨!' : 'Copied!'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-gray-800 dark:text-gray-200 text-sm">
                                        {item.ko}
                                        {item.keywords && (
                                            <div className="flex flex-wrap gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {item.keywords.slice(0, 4).map(k => <span key={k} className="text-[9px] bg-gray-100 dark:bg-gray-700 px-1 rounded text-gray-500">{k}</span>)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 text-sm">
                                        {item.en}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="px-5 py-12 text-center text-gray-400">
                                    <Search className="mx-auto mb-2 opacity-20" size={32} />
                                    <p>{t.noResults} "{searchTerm}"</p>
                                    <p className="text-xs mt-1">{t.tryBroadTerms}</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
