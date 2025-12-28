import { TREATMENT_TARGET_MAP} from '../constants/treatment';
import type { PastTreatment} from '../constants/treatment';


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
  treatmentNo?: string; 
  treatments?: Treatment[];
  past_treatments: PastTreatment[]; // 存储为 key 数组，如 ['surgery', 'laser']
}

// 查询参数接口
export interface PatientQueryParams {
  page?: number;
  pageSize?: number;
  filters?: any;
  sort?: string | string[];
  [key: string]: any; 
}

/**
 * 💡 核心修改：治疗部位类型
 * 使用 keyof typeof 从常量映射表中自动推导类型
 * 结果等同于：'Maxillofacial' | 'Chest' | 'Abdomen & Buttocks' ...
 */
export type TreatmentTarget = keyof typeof TREATMENT_TARGET_MAP;

// 治疗记录实体
export interface Treatment {
  id: number;
  documentId: string;
  treatmentNo: string;        // 治疗编号
  target: TreatmentTarget;    // 治疗部位 (已关联强类型)
  sequence_number: number;    // 序号
  duration?: number; // 使用 ? 设为可选，兼容旧数据
  createdAt: string;
  patient?: Patient;          // 关联的患者信息
  Images?: StrapiMedia[];     // 关联的图片数组 
}

// 治疗记录查询参数
export interface TreatmentQueryParams {
  populate?: string | string[];
  'pagination[page]'?: number;
  'pagination[pageSize]'?: number;
  sort?: string;
  filters?: any;
}

// Strapi v5 Media Object Structure
export interface StrapiImageFormat {
  url: string;
  width: number;
  height: number;
}

export interface StrapiMedia {
  id: number; 
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