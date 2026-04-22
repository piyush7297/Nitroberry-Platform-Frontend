import { client } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import { FileUploadType, FileUploadTypeValue } from "@/lib/enums/file-upload-type.enum";

export interface UploadFilePayload {
    file: File;
    type: FileUploadTypeValue;
    fmsId?: string;
    indentId?: string;
    communityId?: string;
    postId?: string;
    chatId?: string;
    otherId?: string;
    vaultId?: string;
}

/**
 * Upload a file with a specific upload type
 * Supports dynamic type parameter and optional context IDs
 * @param payload - Upload payload containing file, type, and optional context IDs
 * @returns Promise resolving to the uploaded file URL
 */
export const uploadFile = async (payload: UploadFilePayload): Promise<string> => {
    try {
        const { file, type, fmsId, indentId, communityId, postId, chatId, otherId, vaultId } = payload;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type.toString());

        // Append optional context IDs based on upload type
        if (fmsId) formData.append("fmsId", fmsId);
        if (indentId) formData.append("indentId", indentId);
        if (communityId) formData.append("communityId", communityId);
        if (postId) formData.append("postId", postId);
        if (chatId) formData.append("chatId", chatId);
        if (otherId) formData.append("otherId", otherId);
        if (vaultId) formData.append("vaultId", vaultId);

        const response = await client.post(
            API_ENDPOINTS.COMMON_UPLOAD,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        console.log("✅ File Upload Response:", response.data);
        // Backend returns { message: "File uploaded successfully", data: "https://..." }
        return response.data?.data || response.data;
    } catch (error) {
        console.error("❌ Error uploading file:", error);
        throw error;
    }
};

/**
 * Upload a file for FMS module
 * @param file - The file to upload
 * @param fmsId - FMS document ID
 */
export const uploadFileFMS = (file: File, fmsId: string) =>
    uploadFile({ file, type: FileUploadType.FMS, fmsId });

/**
 * Upload a file for Community module
 * @param file - The file to upload
 * @param communityId - Community ID
 */
export const uploadFileCommunity = (file: File, communityId: string) =>
    uploadFile({ file, type: FileUploadType.COMMUNITY, communityId });

/**
 * Upload a file for Posts module
 * @param file - The file to upload
 * @param postId - Post ID
 */
export const uploadFilePost = (file: File, postId: string) =>
    uploadFile({ file, type: FileUploadType.POST, postId });

/**
 * Upload a file for Chats module
 * @param file - The file to upload
 * @param chatId - Chat ID
 */
export const uploadFileChats = (file: File, chatId: string) =>
    uploadFile({ file, type: FileUploadType.CHATS, chatId });

/**
 * Upload a file for Other purposes
 * @param file - The file to upload
 * @param otherId - Optional contextual ID
 */
export const uploadFileOther = (file: File, otherId?: string) =>
    uploadFile({ file, type: FileUploadType.OTHERS, otherId });

/**
 * Upload a file for Indent module
 * @param file - The file to upload
 * @param indentId - Indent ID
 * @param fmsId - Optional FMS ID
 */
export const uploadFileIndent = (file: File, indentId: string, fmsId?: string) =>
    uploadFile({ file, type: FileUploadType.INDENT, indentId, fmsId });

/**
 * Upload a file for Vault module
 * @param file - The file to upload
 * @param vaultId - Vault ID
 */
export const uploadFileVault = (file: File, vaultId: string) =>
    uploadFile({ file, type: FileUploadType.VAULT, vaultId });
