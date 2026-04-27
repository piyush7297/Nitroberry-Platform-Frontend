export enum FileUploadType {
    FMS = 1,
    COMMUNITY = 2,
    POST = 3,
    CHATS = 4,
    OTHERS = 5,
    INDENT = 6,
    VAULT = 7,
}

export type FileUploadTypeValue = typeof FileUploadType[keyof typeof FileUploadType];
