import {useCallback, useState} from "react";

export const useEditorContent = () => {
    const [editorContent, setEditorContent] = useState<string>("");

    const handleSetEditorContent = useCallback((content: string) => {
        setEditorContent(content);
    }, []);

    return {
        editorContent,
        setEditorContent: handleSetEditorContent
    };
};
