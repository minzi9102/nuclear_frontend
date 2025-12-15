// 通用列表响应结构
export interface ApiResponse<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// 患者数据接口 (严格对应 Swagger 文档)
export interface Patient {
  id: number;
  documentId: string; // Strapi v5 新增的唯一标识
  Name: string;       // 注意大写
  Gender: 'male' | 'female';
  Birthday: string;
  treatmentNo?: string; // 如果列表中需要展示治疗号
  treatments?: Treatment[];
}

// 查询参数接口
export interface PatientQueryParams {
  page?: number;      // 对应 pagination[page]
  pageSize?: number;  // 对应 pagination[pageSize]
  filters?: any;      // 对应 filters[xxx]
  sort?: string | string[]; // 排序
  [key: string]: any; // 允许其他动态参数 (如 populate)
}

// 治疗部位枚举 (参考 Swagger)
export type TreatmentTarget = 
  | 'Maxillofacial' 
  | 'Chest' 
  | 'Abdomen & Buttocks' 
  | 'Shoulder & Back' 
  | 'Limbs' 
  | 'Whole Body' 
  | 'Multiple Sites';

// 治疗记录实体
export interface Treatment {
  id: number;
  documentId: string;
  treatmentNo: string;        // 治疗编号
  target: TreatmentTarget;    // 治疗部位
  sequence_number: number;    // 序号
  createdAt: string;
  // 关键：关联的患者信息 (可能为空)
  patient?: Patient;
  // 图片暂时先定义为数组，后续处理
  Images?: StrapiMedia[]; // 关联的图片数组 
}

// 治疗记录查询参数 (继承通用的查询结构)
// 通常可以直接复用之前的，或者单独定义
export interface TreatmentQueryParams {
  populate?: string | string[]; // 关键参数：用于查询关联字段
  'pagination[page]'?: number;
  'pagination[pageSize]'?: number;
  sort?: string;
  filters?: any;
}

// Strapi v5 Media Object Structure (Simplified)
export interface StrapiImageFormat {
  url: string;
  width: number;
  height: number;
}

export interface StrapiMedia {
  id: number; // Upload plugin usually returns integer ID for linkage
  documentId: string;
  url: string;
  name: string;
  width: number;
  height: number;
  formats?: {
    thumbnail?: StrapiImageFormat;
    small?: StrapiImageFormat;
    medium?: StrapiImageFormat;
    large?: StrapiImageFormat;
  };
}