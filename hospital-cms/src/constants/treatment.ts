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