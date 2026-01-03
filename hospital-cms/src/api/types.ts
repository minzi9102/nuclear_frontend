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


// ✨ 新增：病灶详情组件 (对应的 Strapi Component: treatment.lesion-record)
export interface LesionDetail {
  id: number;
  part: TreatmentTarget;       // 部位 (复用之前的类型)
  duration?: number | null;    // 特例时长 (允许为空，为空时使用父级时长)
  photos: StrapiMedia[];       // 该部位对应的图片
  notes?: string;              // 备注 (可选)
}

// 治疗记录实体
export interface Treatment {
  id: number;
  documentId: string;
  treatmentNo: string;
  sequence_number: number;
  createdAt: string;
  patient?: Patient;

  // --- 核心字段变更 ---
  duration: number;            // ✅ 语义变为：基准时长 (Base Duration)
  
  // 🆕 新结构：多病灶详情
  details?: LesionDetail[];    
  
  // 🏚️ 旧结构兼容 (不要删除，用于显示历史数据)
  target?: TreatmentTarget;    
  Images?: StrapiMedia[];      
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