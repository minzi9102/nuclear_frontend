import request from '../utils/request'; // 假设你封装了 axios 实例
import type { StrapiMedia } from './types';

/**
 * 上传文件到 Strapi
 * @param file 浏览器原本的 File 对象
 * @returns 上传成功后的媒体对象
 */
/**
 * 上传文件到 Strapi
 * @param file 浏览器原本的 File 对象
 * @returns 上传成功后的媒体对象
 */
export const uploadFile = async (file: File): Promise<StrapiMedia> => {
  const formData = new FormData();
  formData.append('files', file);

  // 1. 这里使用 <any> 跳过 Axios 的默认类型推断，避免类型打架
  const response = await request.post<any>('/upload', formData);

  // 2. 兼容性处理：
  // 情况A: 你的拦截器直接返回了数据 (response 就是数组)
  // 情况B: 你的拦截器返回了 Axios 完整对象 (response.data 才是数组)
  const fileList = Array.isArray(response) ? response : response?.data;

  // 3. 运行时检查 + 类型强制断言
  if (Array.isArray(fileList) && fileList.length > 0) {
    // 这里的 'as StrapiMedia' 是关键，它告诉 TS "我确信这是 StrapiMedia，别报错了"
    return fileList[0] as StrapiMedia;
  }

  // 4. 如果没拿到数据，抛出异常
  console.error('上传响应异常:', response);
  throw new Error('图片上传失败：无法解析服务器返回的数据');
};

/**
 * (可选) 根据 ID 删除文件
 * 实际上我们通常只断开关联，不物理删除文件，但在编辑模式下可能需要
 */
export const deleteFile = async (fileId: number) => {
  return await request.delete(`/upload/files/${fileId}`);
};