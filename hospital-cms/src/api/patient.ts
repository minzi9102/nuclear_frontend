import request from '../utils/request'
import type { ApiResponse, Patient, PatientQueryParams } from './types'

// 获取患者列表
export const getPatientList = (params: PatientQueryParams) => {
  return request.get<any, ApiResponse<Patient>>('/patients', {
    params
  })
}

// 删除患者 (预留给下一步)
export const deletePatient = (id: number) => {
  return request.delete(`/patients/${id}`)
}

export const createPatient = (data: any) => {
  // Strapi 要求 post 的数据包裹在 { data: ... } 中
  return request.post('/patients', { data })
}

// 修改
export const updatePatient = (id: number, data: any) => {
  return request.put(`/patients/${id}`, { data })
}