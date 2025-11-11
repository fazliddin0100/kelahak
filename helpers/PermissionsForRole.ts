export const getPermissionsForRole = (roleName: string): string[] => {
    const ALL_PERMISSIONS = [
        "create_document", // yaratish
        "edit_document", // ozgartirish
        "create_user", // yaratish
        "edit_user", // ozgartirish
        "delete_user", // ochirish
        "assign_roles", //rollarni almashtirish
        "view_document", // korish
        "view_all_provinces", // barchasini korish
        "register_document", // royxatdan otqazish
        "sign_document", // imzolash
        "archive_document", // arxivlash
        "print_document", // chop etish
    ];

    switch (roleName) {
        case "admin":
            return ALL_PERMISSIONS; // barcha ruxsatlar
        case "superAdmin":
            return ALL_PERMISSIONS;
        case "commander":
        case "deputyCommander":
            return [
                "create_document", // yaratish
                "edit_document", // ozgartirish
                "sign_document", // imzolash
                "send_document", // yuborish
                "archive_document", // arxivlash
                "view_document", // korish
            ];
        default:
            return [
                "create_document", // yaratish
                "edit_document", // ozgartirish
                "sign_document", // imzolash
                "send_document", // yuborish
                "archive_document", // arxivlash
                "view_document", // korish
                "delete_user", // ochirish
            ];
    }
};
