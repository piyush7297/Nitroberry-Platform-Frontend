import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { uploadFile, UploadFilePayload } from "@/api/upload";

export interface UseFileUploadOptions
    extends Omit<UseMutationOptions<string, Error, UploadFilePayload>, "mutationFn"> { }

/**
 * Custom hook for file uploads with type and context ID parameters
 * @param options - Optional TanStack Query mutation options
 * 
 * Usage:
 *   const uploadMutation = useFileUpload();
 *   uploadMutation.mutate({ 
 *     file, 
 *     type: FileUploadType.COMMUNITY,
 *     communityId: "67aa2d1-3ddd-45cf-a579-1b1c19cd85ac"
 *   });
 */
export const useFileUpload = (options?: UseFileUploadOptions) => {
    return useMutation({
        mutationFn: (payload: UploadFilePayload) => uploadFile(payload),
        ...options,
    });
};
