export default class FileTab {
    path: string;
    cursorPosition: number;
    isTextDoc: boolean;
    pinned: boolean;

    /**
     * 
     * @param path File location in the tree
     * @param cursorPosition Position cursor was last placed just prior to branch save
     * @param isTextDoc If file is a text doc or not (e.g. false for logo.png)
     * @param pinned If file was pinned or not just prior to branch save
     */
    constructor(
        path: string,
        cursorPosition: number = 0,
        isTextDoc: boolean = true,
        pinned: boolean = false
    ) {
        this.path = path;
        this.cursorPosition = cursorPosition;
        this.isTextDoc = isTextDoc;
        this.pinned = pinned;
    }

    /**
     * Create a plain object representation of the File instance.
     * @returns Plain object representation of the file
     */
    toObject(): FileTabObject {
        return {
            path: this.path,
            cursorPosition: this.cursorPosition,
            isTextDoc: this.isTextDoc,
            pinned: this.pinned,
        };
    }

    /**
     * Create a File instance from a plain object.
     * @param obj Plain object representation of a file
     * @returns A new FileTab instance
     */
    static fromObject(obj: FileTabObject): FileTab {
        return new FileTab(obj.path, obj.cursorPosition, obj.isTextDoc, obj.pinned);
    }
}

export interface FileTabObject {
    path: string;
    cursorPosition: number;
    isTextDoc: boolean;
    pinned: boolean;
}
