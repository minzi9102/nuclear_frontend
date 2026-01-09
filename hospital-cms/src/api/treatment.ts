import request from '../utils/request'
import type { ApiResponse, Treatment, TreatmentQueryParams } from './types'
import qs from 'qs'

/**
 * 获取患者最新的治疗序号
 * @param patientId 患者的 DocumentId
 */
export const getLastSequenceNumber = (patientId: string) => {
  return request.get('/treatments', {
    params: {
      'filters[patient][documentId][$eq]': patientId,
      'sort': 'sequence_number:desc', // 倒序，取最大的
      'pagination[limit]': 1,         // 只要一条
      'fields[0]': 'sequence_number'  // 只取序号字段，极简
    }
  })
}

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

/**
 * 获取导出 URL (用于浏览器直接下载)
 * @param filters 当前的筛选条件对象
 */
export const getExportUrl = (filters: Record<string, any>) => {
  // 1. 复用列表的筛选条件
  const queryObj = {
    ...filters,
    sort: 'updatedAt:desc', // 强制按时间倒序导出
    // 注意：导出不需要 pagination，后端会自动处理流式遍历
    // 注意：导出不需要 populate，后端 Service 内部已写死
  }

  // 2. 移除 pagination 参数 (如果传入了的话)
  delete (queryObj as any)['pagination[page]'];
  delete (queryObj as any)['pagination[pageSize]'];

  // 关键：arrayFormat: 'indices' 确保 $or 查询被正确转换
  const queryString = qs.stringify(queryObj, { encodeValuesOnly: true, arrayFormat: 'indices' });
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:1337';
  return `${baseUrl}/api/treatments/export?${queryString}`;
}