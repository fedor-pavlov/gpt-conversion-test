module.exports = function(options, bot_ctx) {

    options = Object.assign({
        property: "user",
        ttl: 600,
        support: "@fedor_pavlov",
        logger: console.log
    }, options);

    const logger = options.logger || console.log;
    const ttl = options.ttl && options.ttl * 1000
    const store = new Map()

    if (bot_ctx) {

        bot_ctx.resetCachedUser = (id) => { logger("RESET CACHED USER", {id: id}); store.delete(id) };
    }

    return (ctx, next) => {

        const key = (ctx.from && ctx.from.id) || (ctx.update.message && ctx.update.message.from.id)
        if (!key) return next(ctx);

        const now = Date.now();
        let {user, expires} = store.get(key) || { user: null, expires: null };

        Object.defineProperty(ctx, options.property, {
            get: function () { return user }
        });

        if ((!user) || (expires && expires < now)) {

            return ctx.db.select_user(ctx, {blocked: false}).then(u => {

                user = u;
                store.set(key, { user, expires: ttl ? now + ttl : null });
                if (ctx.chat.type === 'private') logger(`USER: ${user.name}`, ctx.from);
                return next(ctx);

            }, err => {

                logger("FAILURE TO GET USER PROFILE", err);
                if (ctx.chat.type !== 'private') throw err;

                return ctx.reply(`Извиняюсь, не получается загрузить ваш профиль. Пожалуйста, сообщите об этом ${options.support}, постараюсь исправить эту досадную ошибку как можно скорее.`).then(() => {

                    throw err;
                });
            });
        };

        return next(ctx);
    };
};