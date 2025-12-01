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
}

// 查询参数接口
export interface PatientQueryParams {
  'pagination[page]': number;
  'pagination[pageSize]': number;
  'filters[Name][$contains]'?: string; // 用于搜索
  sort?: string; // 例如 'createdAt:desc'
}