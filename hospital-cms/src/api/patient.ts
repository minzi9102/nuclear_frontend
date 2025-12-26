import request from '../utils/request'
import qs from 'qs' // 引入 qs 库处理 Strapi 复杂查询参数
import type { ApiResponse, Patient, PatientQueryParams } from './types'

// 获取患者列表 (增强版：包含关联的治疗记录)
// 获取患者列表 (修复分页报错版)
export const getPatientList = (params: PatientQueryParams) => {
  // 1. 解构出 page 和 pageSize，剩下的通常是 filters
  const { page, pageSize, ...restParams } = params

  // 2. 构造符合 Strapi v5 要求的嵌套对象
  const queryObject = {
    // 关键修复：分页参数必须放在 pagination 对象里
    pagination: {
      page: page,
      pageSize: pageSize
    },
    // 展开过滤参数 (例如 filters)
    ...restParams,
    
    // 关联查询 (保持之前的逻辑)
    populate: {
      treatments: {
        fields: ['treatmentNo', 'target', 'createdAt', 'documentId'],
        sort: ['createdAt:desc']
      }
    }
  }

  // 3. 序列化
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