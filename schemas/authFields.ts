export const authFields = {
    login: {type: String, required: true},
    password: {type: String, required: true, select: false}, // Parolni ko‘rsatmaslik
};
