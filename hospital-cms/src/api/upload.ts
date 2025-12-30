import request from '../utils/request'; // 假设你封装了 axios 实例
import type { StrapiMedia } from './types';

/**
 * 上传文件到 Strapi
 * @param file 文件对象
 * @param customName (新增) 自定义文件名，例如 "张三_20251230_面部_01.jpg"
 */
export const uploadFile = async (file: File, customName?: string): Promise<StrapiMedia> => {
  const formData = new FormData();
  
  if (customName) {
    // ✅ 关键点：FormData 的第三个参数可以强制重命名文件
    formData.append('files', file, customName); 
  } else {
    formData.append('files', file);
  }

  const response = await request.post<any>('/upload', formData);
  
  // ... 保持原有解析逻辑 ...
  const fileList = Array.isArray(response) ? response : response?.data;
  if (Array.isArray(fileList) && fileList.length > 0) {
    return fileList[0] as StrapiMedia;
  }
  throw new Error('上传失败');
};

/**
 * (可选) 根据 ID 删除文件
 * 实际上我们通常只断开关联，不物理删除文件，但在编辑模式下可能需要
 */
export const deleteFile = async (fileId: number) => {
  return await request.delete(`/upload/files/${fileId}`);
};