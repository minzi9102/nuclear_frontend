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
export const deleteTreatment = (id: number) => {
  return request.delete<any, any>(`/treatments/${id}`)
}