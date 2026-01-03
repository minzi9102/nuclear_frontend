import request from '../utils/request'
import type { ApiResponse, Treatment, TreatmentQueryParams } from './types'
import qs from 'qs'

// 获取治疗记录列表
export const getTreatmentList = (params: TreatmentQueryParams) => {
  // 构建深度查询对象
  const queryObj = {
    ...params,
    populate: {
      patient: true,          // 关联患者
      Images: true,           // 兼容旧数据的图片
      // ✨ 新增：深度 Populate 组件及其内部图片
      details: {
        populate: 'photos'
      }
    }
  }

  // 使用 qs.stringify 处理嵌套对象，避免 Strapi 解析失败
  const queryString = qs.stringify(queryObj, { encodeValuesOnly: true })

  return request.get<any, ApiResponse<Treatment>>(`/treatments?${queryString}`)
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

// 获取单条治疗记录详情（包含图片）
export const getTreatmentDetail = (documentId: string) => {
  const query = qs.stringify({
    populate: {
      patient: true,
      Images: true, // 兼容旧数据
      details: {
        populate: 'photos' // 获取组件内的图片
      }
    }
  }, { encodeValuesOnly: true })

  return request.get<any, { data: Treatment }>(`/treatments/${documentId}?${query}`)
}