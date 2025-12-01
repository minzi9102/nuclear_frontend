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