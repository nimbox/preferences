export type RegisterElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export type ChangeHandler = (event: { target: RegisterElement; }) => void;
