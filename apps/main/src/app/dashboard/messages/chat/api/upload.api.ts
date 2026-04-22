import { UploadParams, UploadResponse } from "../types/chat";
import { client } from "@/api/client";
export const uploadMedia = async (params: UploadParams) => {
  const { files, fileName } = params;
  const formData = new FormData();

  const fileArray = Array.isArray(files) ? files : [files];

  fileArray.forEach((file, index) => {
    if (file instanceof Blob && !(file instanceof File)) {
      const name = fileName || `upload-${Date.now()}-${index}`;
      formData.append("files", file, name);
    } else {
      formData.append("files", file as File);
    }
  });

  const response = await client.post("/common/upload/bulk", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data as UploadResponse;
};
