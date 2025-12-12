import request from '../utils/request'
import type { ApiResponse, Treatment, TreatmentQueryParams } from './types'

// 获取治疗记录列表
export const getTreatmentList = (params: TreatmentQueryParams) => {
  return request.get<any, ApiResponse<Treatment>>('/treatments', {
    params: {
      ...params,
      // 🔥 核心魔法：告诉 Strapi 把关联的 patient 信息也查出来
      populate: ['patient', 'Images'] 
    }
  })
}

// 删除治疗记录
export const deleteTreatment = (documentId: string) => {
  return request.delete(`/treatments/${documentId}`)
}

// ✨ 新增：创建治疗记录
export const createTreatment = (data: any) => {
  return request.post('/treatments', { data })
}

// ✨ 新增：更新治疗记录
export const updateTreatment = (documentId: string, data: any) => {
  return request.put(`/treatments/${documentId}`, { data })
}