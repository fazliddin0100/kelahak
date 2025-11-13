export const getHTMLContent = (html: string): string => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    return wrapper.innerHTML;
};
