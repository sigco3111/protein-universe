// 단백질 유니버스 - 전시품 데이터
// 구조 데이터: AlphaFold Protein Structure Database (EMBL-EBI · DeepMind), CC-BY-4.0
// https://alphafold.ebi.ac.uk/  각 항목은 UniProt accession으로 조회 가능
// plddt: 2026-11-17 AlphaFold DB 예측 파일(.cif)의 잔기별 pLDDT 평균(100점 만점)을 직접 계산

export const CATEGORIES = {
  signal: { name: '신호와 호르몬 성단', color: '#ffd180' },
  oxygen: { name: '산소와 혈액 성단', color: '#ff8a80' },
  tools: { name: '생명의 도구 성단', color: '#b388ff' },
  virus: { name: '바이러스의 무기 성단', color: '#ff5d73' },
  extreme: { name: '극한의 생존자 성단', color: '#64e0d2' },
  legend: { name: '전설의 성단', color: '#ffd54f' },
};

// 전설의 별이 나타나는 조건: 전설을 제외한 별을 이 개수 이상 발견
export const LEGEND_THRESHOLD = 18;

// 박물관 마일스톤(발견 수)
export const MILESTONES = [6, 12, 18, 24];

// 평균 pLDDT 구간별 별 색상 (AlphaFold 신뢰도 색을 밤하늘용으로 밝게 조정)
export function plddtColor(v) {
  if (v >= 90) return '#5e97ff'; // 매우 높음
  if (v >= 70) return '#6fd3f2'; // 높음
  if (v >= 50) return '#ffdb4d'; // 낮음
  return '#ff8a4d'; // 매우 낮음
}

export const PROTEINS = [
  /* ---------- 신호와 호르몬 성단 ---------- */
  {
    acc: 'P01308', name: '인슐린 전구체', name_en: 'Insulin (precursor)', category: 'signal',
    organism: '사람', length: 110, plddt: 52.9, cif: 'assets/structures/P01308.cif',
    oneLiner: '혈당을 조절하는 호르몬의 원료 형태',
    story: '혈당을 낮추는 인슐린은 처음에 신호펩타이드를 포함한 하나의 긴 사슬(전구체)로 합성된 뒤, 일부가 잘려 나가며 완성됩니다. 이 별은 그 전구체 서열 전체의 예측입니다.',
    caution: '완성된 인슐린이 아니라 전구체 서열의 예측입니다. 신호 부위는 모양이 유연해서 신뢰도가 낮게(52.9) 나옵니다. 예측의 실패가 아니라 "고정된 모양이 없다"는 뜻입니다.',
    x: 400, y: 250,
  },
  {
    acc: 'P01241', name: '성장호르몬', name_en: 'Somatotropin', category: 'signal',
    organism: '사람', length: 217, plddt: 79.3, cif: 'assets/structures/P01241.cif',
    oneLiner: '성장을 지시하는 신호 단백질',
    story: '뇌하수체에서 분비되어 키 성장과 대사를 지시하는 호르몬입니다. 세포 표면의 수용체에 붙어 성장 신호를 전달합니다.',
    x: 590, y: 340,
  },
  {
    acc: 'P04637', name: 'p53', name_en: 'Cellular tumor antigen p53', category: 'signal',
    organism: '사람', length: 393, plddt: 75.1, cif: 'assets/structures/P04637.cif',
    oneLiner: '게놈의 수호자, 암 억제 단백질',
    story: 'DNA가 손상되면 세포 분열을 멈추고 복구를 지시하며, 복구가 불가능하면 세포 자살을 유도합니다. 인간 암의 절반가량에서 이 단백질에 이상이 발견됩니다.',
    caution: '일부 영역이 하나의 고정된 모양 없이 유연하게 움직여서(본질적 무질서 영역) 신뢰도가 부분적으로 낮게(75.1) 표시됩니다.',
    x: 470, y: 170,
  },

  /* ---------- 산소와 혈액 성단 ---------- */
  {
    acc: 'P02144', name: '미오글로빈', name_en: 'Myoglobin', category: 'oxygen',
    organism: '사람', length: 154, plddt: 97.2, cif: 'assets/structures/P02144.cif',
    oneLiner: '근육 세포의 산소 저장고',
    story: '근육 세포 안에 산소를 저장했다가 필요할 때 건네주는 단백질입니다. 미오글로빈은 1958년 세계 최초로 입체 구조가 밝혀진 단백질로, 이 발견은 1962년 노벨 화학상이 되었습니다.',
    x: 370, y: 700,
  },
  {
    acc: 'P69905', name: '헤모글로빈 알파 사슬', short: '헤모글로빈 α', name_en: 'Hemoglobin subunit alpha', category: 'oxygen',
    organism: '사람', length: 142, plddt: 98.1, cif: 'assets/structures/P69905.cif',
    oneLiner: '혈액 속 산소 운반체의 한 사슬',
    story: '적혈구에서 산소를 나르는 헤모글로빈은 알파 사슬 2개와 베타 사슬 2개가 모여 완성됩니다. 이 별은 그중 알파 사슬 하나의 예측 구조입니다.',
    caution: '실제 작동 형태는 4개 사슬이 모인 조립체입니다. 이 항목은 그중 한 사슬입니다.',
    x: 610, y: 655,
  },
  {
    acc: 'P02768', name: '혈청 알부민', name_en: 'Albumin', category: 'oxygen',
    organism: '사람', length: 609, plddt: 92.7, cif: 'assets/structures/P02768.cif',
    oneLiner: '혈액의 화물선',
    story: '혈장에 가장 많은 단백질로, 지방산·호르몬·약물을 실어 나르고 혈액의 삼투압을 유지합니다. 한 번 만들어지면 약 3주 동안 혈액을 떠돌며 일합니다.',
    x: 630, y: 830,
  },
  {
    acc: 'P99999', name: '시토크롬 c', name_en: 'Cytochrome c', category: 'oxygen',
    organism: '사람', length: 105, plddt: 97.9, cif: 'assets/structures/P99999.cif',
    oneLiner: '세포 호흡의 전자 운반책',
    story: '미토콘드리아에서 전자를 나르며 세포가 에너지(ATP)를 만들게 돕습니다. 진화 과정에서 모습이 거의 바뀌지 않아, 생명의 역사를 비교하는 표본이 됩니다.',
    x: 410, y: 870,
  },

  /* ---------- 생명의 도구 성단 ---------- */
  {
    acc: 'P61626', name: '리소자임', name_en: 'Lysozyme C', category: 'tools',
    organism: '사람', length: 148, plddt: 94.1, cif: 'assets/structures/P61626.cif',
    oneLiner: '눈물과 침의 항균 효소',
    story: '세균의 세포벽을 잘라 녹이는 효소로, 눈물·침·콧물에서 몸의 1차 방어선을 지킵니다. 1922년 알렉산더 플레밍이 발견했습니다.',
    x: 350, y: 1130,
  },
  {
    acc: 'P42212', name: 'GFP (형광 단백질)', short: 'GFP', name_en: 'Green fluorescent protein', category: 'tools',
    organism: '해파리 (Aequorea victoria)', length: 238, plddt: 96.6, cif: 'assets/structures/P42212.cif',
    oneLiner: '스스로 빛나는 해파리의 단백질',
    story: '해파리에서 온 형광 단백질로, 스스로 초록빛을 냅니다. 살아있는 세포에 형광 표지를 붙이는 도구가 되어 생명과학을 바꿨고, 2008년 노벨 화학상을 받았습니다.',
    x: 620, y: 1100,
  },
  {
    acc: 'P0DTC2', name: '코로나19 스파이크', short: '스파이크', name_en: 'Spike glycoprotein', category: 'tools',
    organism: '코로나19 바이러스 (SARS-CoV-2)', length: 1273, plddt: 67.1, cif: 'assets/structures/P0DTC2.cif',
    oneLiner: '바이러스가 세포를 여는 열쇠',
    story: '바이러스 표면의 스파이크는 인간 세포의 ACE2 수용체에 달라붙어 감염을 시작합니다. 백신과 항체 치료제의 주요 표적이 된, 가장 유명한 바이러스 단백질입니다.',
    caution: '이 항목은 단일 사슬이며, 실제 바이러스 표면에서는 3개의 사슬이 모여(삼량체) 작동합니다.',
    x: 710, y: 1270,
  },
  {
    acc: 'Q99ZW2', name: 'Cas9', name_en: 'CRISPR-associated endonuclease Cas9', category: 'tools',
    organism: '화농성연쇄상구균', length: 1368, plddt: 88.4, cif: 'assets/structures/Q99ZW2.cif',
    oneLiner: '유전자 가위',
    story: '세균이 바이러스로부터 스스로를 지키던 CRISPR 면역의 DNA 절단 효소입니다. 안내 RNA를 설계해 원하는 유전자를 편집하는 도구가 되었고, 2020년 노벨 화학상을 받았습니다.',
    caution: '이 예측은 안내 RNA·DNA가 없는 단백질 단독(apo) 형태입니다. 실제 편집은 RNA·DNA와 결합한 복합체에서 일어납니다.',
    x: 520, y: 1370,
  },
  {
    acc: 'P60709', name: '액틴', name_en: 'Actin, cytoplasmic 1', category: 'tools',
    organism: '사람', length: 375, plddt: 95.2, cif: 'assets/structures/P60709.cif',
    oneLiner: '세포의 골격을 이루는 벽돌',
    story: '수많은 액틴이 사슬처럼 이어져 세포의 골격(액틴 필라멘트)을 만듭니다. 근육 수축과 세포 이동의 주역입니다. 이 별은 그 한 단위체입니다.',
    caution: '실제로는 수많은 단위체가 긴 필라멘트로 모여 작동합니다. 이 항목은 단량체 하나의 예측입니다.',
    x: 320, y: 1310,
  },

  /* ---------- 바이러스의 무기 성단 ---------- */
  {
    acc: 'P03452', name: '헤마글루티닌', short: 'HA', name_en: 'Hemagglutinin', category: 'virus',
    organism: '인플루엔자 A 바이러스', length: 565, plddt: 77.7, cif: 'assets/structures/P03452.cif',
    oneLiner: '독감 바이러스가 세포에 붙는 갈고리',
    story: '인플루엔자(독감) 바이러스 표면에서 세포 표면의 당 분자(시알산)에 달라붙어 감염을 시작합니다. 매년 조금씩 모양을 바꿔 면역을 따돌리기 때문에 독감 백신도 매년 새로 맞아야 합니다.',
    caution: '실제 바이러스 표면에서는 3개가 모여(삼량체) 작동합니다. 이 항목은 단일 사슬 전구체의 예측입니다.',
    x: 350, y: 1560,
  },
  {
    acc: 'P03468', name: '뉴라미니다제', short: 'NA', name_en: 'Neuraminidase', category: 'virus',
    organism: '인플루엔자 A 바이러스', length: 454, plddt: 86.4, cif: 'assets/structures/P03468.cif',
    oneLiner: '새 바이러스의 탈출을 돕는 칼날',
    story: '독감 바이러스가 세포 안에서 증식한 뒤, 새로 만들어진 바이러스가 세포 표면에 달라붙은 채 떠나지 못하지 않도록 끈적한 사슬을 잘라 줍니다. 타미플루 같은 독감 치료제는 이 효소를 막아 바이러스를 세포에 가둡니다.',
    x: 640, y: 1545,
  },
  {
    acc: 'P04578', name: 'HIV 엔벨로프 gp160', short: 'HIV gp160', name_en: 'Envelope glycoprotein gp160', category: 'virus',
    organism: '인간 면역결핍 바이러스 (HIV-1)', length: 856, plddt: 72.1, cif: 'assets/structures/P04578.cif',
    oneLiner: '면역 세포를 여는 위장의 달인',
    story: 'HIV가 면역 세포의 CD4 수용체에 붙어 침입할 때 쓰는 표면 단백질의 전구체입니다. 당 사슬을 잔뜩 두르고 끊임없이 모양을 바꿔 항체의 추적을 따돌립니다.',
    caution: '실제로는 잘려서 gp120과 gp41로 나뉘고, 3쌍이 모인 삼량체로 작동합니다. 이 항목은 절단 전 전구체 전체의 예측입니다.',
    x: 700, y: 1705,
  },
  {
    acc: 'Q9IH62', name: '니파 바이러스 G 당단백질', short: '니파 G', name_en: 'Glycoprotein G', category: 'virus',
    organism: '니파 바이러스', length: 602, plddt: 81.6, cif: 'assets/structures/Q9IH62.cif',
    oneLiner: '치명적인 인수공통 바이러스의 열쇠',
    story: '과일박쥐에서 돼지·사람으로 넘어오는 니파 바이러스가 세포의 에프린 수용체에 달라붙을 때 쓰는 단백질입니다. 치사율이 높아 세계보건기구가 우선 감시하는 병원체의 무기입니다.',
    x: 470, y: 1790,
  },
  {
    acc: 'P0DTC4', name: '코로나19 엔벨로프 E', short: '엔벨로프 E', name_en: 'Envelope small membrane protein', category: 'virus',
    organism: '코로나19 바이러스 (SARS-CoV-2)', length: 75, plddt: 75.8, cif: 'assets/structures/P0DTC4.cif',
    oneLiner: '바이러스 조립을 돕는 아주 작은 막 단백질',
    story: '스파이크가 유명하지만, 이 작은 E 단백질이 없으면 코로나19 바이러스 입자가 제대로 조립되지 않습니다. 아미노산 75개짜리 이 작은 별이 바이러스 껍질의 곡률과 방출을 결정합니다.',
    x: 285, y: 1700,
  },

  /* ---------- 극한의 생존자 성단 ---------- */
  {
    acc: 'P19821', name: '탁 중합효소', short: 'Taq', name_en: 'DNA polymerase I, thermostable', category: 'extreme',
    organism: '테르무스 아쿠아티쿠스 (온천 세균)', length: 832, plddt: 91.4, cif: 'assets/structures/P19821.cif',
    oneLiner: '뜨거운 온천에서 온 PCR의 심장',
    story: '뜨거운 온천에 사는 세균의 DNA 복제 효소입니다. 끓는 물 가까이에서도 망가지지 않아, DNA를 수십억 배로 복제하는 PCR 기술의 핵심이 되었고 1993년 노벨 화학상의 한 축이 되었습니다.',
    x: 360, y: 1915,
  },
  {
    acc: 'P02945', name: '박테리오로돕신', name_en: 'Bacteriorhodopsin', category: 'extreme',
    organism: '할로박테리움 (소금 호수 고균)', length: 262, plddt: 91.7, cif: 'assets/structures/P02945.cif',
    oneLiner: '소금 호수에서 빛을 에너지로 바꾸는 펌프',
    story: '소금이 가득한 호수에 사는 고균이 햇빛을 받아 양성자를 세포 밖으로 밀어 내는 데 쓰는 보라색 막 단백질입니다. 막 단백질 구조 연구의 시대를 연 역사적인 별입니다.',
    x: 645, y: 1900,
  },
  {
    acc: 'P00800', name: '서모라이신', name_en: 'Thermolysin', category: 'extreme',
    organism: '고온성 바실러스', length: 548, plddt: 92.0, cif: 'assets/structures/P00800.cif',
    oneLiner: '열에 강한 단백질 가위',
    story: '고온 세균이 만드는 단백질 분해 효소로, 뜨거운 환경에서도 다른 단백질을 잘라냅니다. 이 구조 연구는 아스파탐 감미료 생산과 효소 공학의 밑바탕이 되었습니다.',
    x: 705, y: 2050,
  },
  {
    acc: 'P42443', name: 'RecA (방사선 생존자)', short: 'RecA', name_en: 'Protein RecA', category: 'extreme',
    organism: '데이노코커스 라디오두란스', length: 363, plddt: 88.8, cif: 'assets/structures/P42443.cif',
    oneLiner: '방사선에 부서진 DNA를 꿰매는 재봉사',
    story: '데이노코커스 라디오두란스는 사람에게 치명적인 방사선의 수백 배를 견딥니다. 비결 중 하나가 이 RecA 단백질로, 산산조각 난 DNA를 빠르게 다시 꿰매 붙입니다.',
    x: 490, y: 2140,
  },
  {
    acc: 'Q51739', name: '텅스텐 함유 산화환원효소', short: '텅스텐 효소 AOR', name_en: 'Tungsten-containing aldehyde ferredoxin oxidoreductase', category: 'extreme',
    organism: '파이로코커스 퓨리오수스 (열수구 고균)', length: 605, plddt: 98.1, cif: 'assets/structures/Q51739.cif',
    oneLiner: '100°C 바다에서 일하는 텅스텐 효소',
    story: '해저 화구 옆 약 100°C의 바닷물에서 사는 고균의 효소로, 몸 안에 희귀 금속 텅스텐을 품고 일합니다. 끓는 물에서도 형태가 무너지지 않는 극한의 내열 설계를 보여 줍니다.',
    x: 295, y: 2060,
  },

  /* ---------- 전설의 성단 (숨은 별: 18개 발견 시 등장) ---------- */
  {
    acc: 'P00875', name: '루비스코 대형 사슬', short: '루비스코', name_en: 'Ribulose bisphosphate carboxylase large chain', category: 'legend',
    legendary: true,
    organism: '시금치', length: 475, plddt: 97.0, cif: 'assets/structures/P00875.cif',
    oneLiner: '지구에서 가장 많은 효소',
    story: '식물의 엽록체에서 공기 중 이산화탄소를 붙잡아 유기물로 바꾸는 광합성의 심장입니다. 지구에 가장 많이 존재하는 효소로, 우리가 먹고 숨 쉬는 거의 모든 것이 이 별에서 시작됩니다.',
    caution: '실제로는 대형 사슬 8개와 소형 사슬 8개가 모인 거대 조립체로 일합니다. 이 항목은 대형 사슬 하나의 예측입니다.',
    x: 395, y: 2305,
  },
  {
    acc: 'P29972', name: '아쿠아포린-1', name_en: 'Aquaporin-1', category: 'legend',
    legendary: true,
    organism: '사람', length: 269, plddt: 90.8, cif: 'assets/structures/P29972.cif',
    oneLiner: '물만 지나가는 세포막의 터널',
    story: '세포막에 뚫린 오직 물 분자만을 위한 통로입니다. 1초에 물 분자 수십억 개를 통과시키면서 양성자 하나는 철저히 막아냅니다. 이 발견은 2003년 노벨 화학상이 되었습니다.',
    x: 615, y: 2295,
  },
];

// 성단(별자리) 연결선: 같은 성단 안에서 순서대로 잇는다
export const EDGES = [
  ['P02144', 'P69905'], ['P69905', 'P02768'], ['P02768', 'P99999'], ['P99999', 'P02144'],
  ['P01308', 'P01241'], ['P01241', 'P04637'], ['P04637', 'P01308'],
  ['P61626', 'P42212'], ['P42212', 'P0DTC2'], ['P0DTC2', 'Q99ZW2'], ['Q99ZW2', 'P60709'], ['P60709', 'P61626'],
  ['P03452', 'P03468'], ['P03468', 'P04578'], ['P04578', 'Q9IH62'], ['Q9IH62', 'P0DTC4'], ['P0DTC4', 'P03452'],
  ['P19821', 'P02945'], ['P02945', 'P00800'], ['P00800', 'P42443'], ['P42443', 'Q51739'], ['Q51739', 'P19821'],
  ['P00875', 'P29972'],
];

// 성단 이름표의 월드 좌표
export const CENTERS = {
  signal: [500, 90],
  oxygen: [480, 620],
  tools: [500, 1030],
  virus: [500, 1475],
  extreme: [240, 1855],
  legend: [505, 2370],
};

export const WORLD = { w: 1000, h: 2400 };

export function byAcc(acc) {
  return PROTEINS.find((p) => p.acc === acc);
}

export function visibleProteins(legendRevealed) {
  return PROTEINS.filter((p) => !p.legendary || legendRevealed);
}
