function resolveAbilities(user) {
    return {
        canCommentOnMembers: user.abilities?.canCommentOnMembers !== false,
        canRequestAssignment: user.abilities?.canRequestAssignment !== false,
        canRequestTakeover: user.abilities?.canRequestTakeover !== false,
    };
}

function formatUserResponse(user) {
    const base = {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile_number: user.mobile_number || null,
        role: user.role,
        monthlyTarget: user.monthlyTarget ?? 0,
        createdAt: user.createdAt,
    };

    if (user.role === "Sales") {
        base.abilities = resolveAbilities(user);
    }

    if (user.role === "Receptionist" || user.role === "Sales") {
        base.canViewPhones = user.canViewPhones ?? true;
    }

    return base;
}

module.exports = { resolveAbilities, formatUserResponse };
