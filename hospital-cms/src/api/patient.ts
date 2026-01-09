import request from '../utils/request'
import qs from 'qs' // 引入 qs 库处理 Strapi 复杂查询参数
import type { ApiResponse, Patient, PatientQueryParams } from './types'

export const getPatientList = (params: PatientQueryParams) => {
  const { page, pageSize, ...restParams } = params

  // 1. 定义默认的“轻量级”关联 (只查基础信息，不查图片)
  // 这是给首页卡片列表用的，防止加载太慢
  const defaultPopulate = {
    treatments: {
      fields: ['treatmentNo', 'target', 'createdAt', 'documentId', 'duration'], // 加上 duration
      sort: ['createdAt:desc'],
      populate: {
        // 1. 获取新结构：多病灶详情
        details: {
          populate: ['photos'] // 必须显式 populate 组件内的媒体字段
        },
        // 2. 兼容旧结构：获取顶层图片
        Images: {
          fields: ['url', 'width', 'height', 'formats', 'name']
        }
      }
    }
  }

  // 2. 构造查询对象
  const queryObject = {
    pagination: {
      page: page,
      pageSize: pageSize
    },
    
    // ✅ 核心修改：新增主列表排序逻辑
    // 逻辑：如果组件没有指定排序，默认按 'updatedAt:desc' (最近更新/活跃的在最前)
    sort: restParams.sort || ['updatedAt:desc'],

    // 填充关联策略
    populate: restParams.populate || defaultPopulate,

    // 展开剩余参数 (filters 等)
    ...restParams,
  }

  const queryString = qs.stringify(queryObject, {
    encodeValuesOnly: true
  })

  return request.get<any, ApiResponse<Patient>>(`/patients?${queryString}`)
}

// 删除患者
// ⚠️ 注意：Strapi v5 默认操作 ID 通常是 documentId (字符串)，而非数据库 id (数字)
// 如果你之前验证过是用 documentId，请使用 string 类型
export const deletePatient = (documentId: string) => {
  return request.delete(`/patients/${documentId}`)
}

// 创建患者
export const createPatient = (data: any) => {
  const { documentId, treatments, id, ...dataToSubmit } = data
  // Strapi 要求 post 的数据包裹在 { data: ... } 中
  return request.post('/patients', { data: dataToSubmit })
}

// 修改患者
// ⚠️ 注意：同删除，Strapi v5 建议使用 documentId
export const updatePatient = (documentId: string, data: any) => {
  const { documentId: _, treatments, id, ...dataToSubmit } = data
  return request.put(`/patients/${documentId}`, { data: dataToSubmit })
}

/**
 * 🔍 下拉框专用：轻量级患者搜索
 * @param query 搜索关键词 (姓名或DocumentId)
 */
export const searchPatients = (query: string) => {
  const queryObject = {
    filters: {
      $or: [
        { Name: { $contains: query } },
        { documentId: { $contains: query } }
      ]
    },
    // ✅ 性能优化：只取下拉框展示需要的字段，不查关联数据
    fields: ['Name', 'Gender', 'Birthday', 'documentId'],
    pagination: {
      limit: 20 // 限制显示前 20 条，防止下拉框过长卡顿
    }
  }

  const queryString = qs.stringify(queryObject, {
    encodeValuesOnly: true
  })

  return request.get<any, ApiResponse<Patient>>(`/patients?${queryString}`)
}