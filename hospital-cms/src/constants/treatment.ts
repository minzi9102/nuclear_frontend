/**
 * 治疗部位原始枚举值与中文映射表
 * 这样定义可以方便地通过 TREATMENT_TARGET_MAP['Chest'] 获取 '胸部'
 */
export const TREATMENT_TARGET_MAP: Record<string, string> = {
  'Maxillofacial': '颌面部',
  'Chest': '胸部',
  'Abdomen & Buttocks': '腹部与臀部',
  'Shoulder & Back': '肩背部',
  'Limbs': '四肢',
  'Whole Body': '全身',
  'Multiple Sites': '多部位'
};

/**
 * 用于 ElSelect 等组件的选择项列表
 */
export const TARGET_OPTIONS = Object.entries(TREATMENT_TARGET_MAP).map(([value, label]) => ({
  value,
  label
}));

// 1. 定义翻译映射表
export const PAST_TREATMENT_MAP = {
  none: '无',
  surgery: '手术',
  injection: '注射',
  sr90: '锶90',
  brachytherapy: '浅放',
  laser: '激光',
  other: '其他'
} as const;

// 2. 导出选项数组供 el-checkbox-group 使用
export const PAST_TREATMENT_OPTIONS = Object.entries(PAST_TREATMENT_MAP).map(([value, label]) => ({
  value,
  label
}));

// 3. 动态推导类型 (类型安全)
export type PastTreatment = keyof typeof PAST_TREATMENT_MAP;