////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE PREREQUISITS //////////////////////////////////////////////////////////////////////////////

const { SOURCE_ID,
        SOURCE_TITLE,
        DEFAULT_LANGUAGE }  = require('../constants');
const EXTRA                 = require('telegraf/extra');
const TEXT                  = require('./texts');
const trace                 = require('../../../tracer').create({ title: SOURCE_TITLE + '[SPEECH MODULE]', source: SOURCE_ID });
const _                     = require('underscore');
const { toText }            = require('object-to-text');





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// CONSISTENCY CHECKS ///////////////////////////////////////////////////////////////////////////////

Object.values(TEXT)
    .filter(i => !i[DEFAULT_LANGUAGE])
    .map(i => trace.error(`speach item [${i}] does not contain language option for default language [${DEFAULT_LANGUAGE}]`));





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MESSAGE CLASS ////////////////////////////////////////////////////////////////////////////////////


class MESSAGE{

    constructor({ctx, proto, language_code}) {

        Object.defineProperty(this, 'ctx', {

            configurable    :false,
            enumerable      :false,
            writable        :false,
            value           :ctx
        })

        Object.defineProperty(this, 'proto', {

            configurable    :false,
            enumerable      :false,
            writable        :false,
            value           :proto
        })

        Object.defineProperty(this, 'msg', {

            configurable    :false,
            enumerable      :false,
            writable        :false,
            value           :_.sample(proto[language_code || ctx.from && ctx.from.language_code] || proto[DEFAULT_LANGUAGE] || proto['ru'])
        })

        Object.defineProperty(this, 'text', {

            configurable    :false,
            enumerable      :false,
            writable        :true,
            value           :this.msg.text
        })

        if (this.proto.html) {

            this.extra = (this.extra || EXTRA).HTML()
        }

        if (this.proto.menu) {

            this.extra = (this.extra || EXTRA).markup(EXTRA.Markup.keyboard(this.proto.menu).resize())
        }
    }

    reply_markup(keyboard_context) {

        return build_inline_keyboard_markup(this.proto.keyboard, this.msg, keyboard_context)
    }

    with(data) {

        this.text = toText(data, this.msg.text) || this.msg.default
        return this
    }

    keyboard(keyboard_context) {

        if (this.proto.keyboard) {

            this.kb = keyboard_context || {};
            this.extra = (this.extra || EXTRA).markup(build_inline_keyboard_markup(this.proto.keyboard, this.msg, keyboard_context))
        }

        return this
    }

    inReplyTo(msg_id) {

        let id = msg_id || this.ctx.update && this.ctx.update.message && this.ctx.update.message.message_id;

        if (id) {

            this.extra = (this.extra || EXTRA).inReplyTo(id);
        }

        return this;
    }

    reply() {

        this.proto.keyboard && (this.kb || this.keyboard({})) // ensures keyboard is displayed even if user has forgotten to setup callback data
        return this.ctx.reply(this.text, this.extra);
    }

    say() {

        this.proto.keyboard && (this.kb || this.keyboard({})) // ensures keyboard is displayed even if user has forgotten to setup callback data
        return this.ctx.reply(this.text, this.extra);
    }

    send(chat) {

        // "ctx.telegram.sendMessage" and "bot.telegram.sendMessage" return different results.
        // if you need details of a message just sent (like message_id and chat.id) then
        // you should use "bot.telegram.sendMessage" function. But in order to do so you
        // need to setup bot property of bot.context in advance, so this framework can receive reference to the bot

        return (this.ctx.bot || this.ctx).telegram.sendMessage(chat, this.text, this.extra);
    }

    broadcast(chats, pace = 1000) {

        // "ctx.telegram.sendMessage" and "bot.telegram.sendMessage" return different results.
        // if you need details of a message just sent (like message_id and chat.id) then
        // you should use "bot.telegram.sendMessage" function. But in order to do so you
        // need to setup bot property of bot.context in advance, so this framework can receive reference to the bot

        let ctx = this.ctx.bot || this.ctx
        let text = this.text
        let extra = this.extra

        return Promise.allSettled(chats.map((i,n) => new Promise(resolve => setTimeout(() => resolve(ctx.telegram.sendMessage(i, text, extra)), n*pace))));
    }
}





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE TOOLS /////////////////////////////////////////////////////////////////////////////////////

function encode_callback(name, args) {

    let data = `{"${name}":${JSON.stringify(args)}}`; 
    if (data.length > 64) trace.error(`callback data [${data}] is over 64 bytes (${data.length})`);
    return data;
}





function build_inline_keyboard_markup(buttons, msg, keyboard_context) {

    return EXTRA.Markup.inlineKeyboard(

        buttons.map(x => x.map(y => EXTRA.Markup.callbackButton(msg[y], encode_callback(y, keyboard_context))))
    );
}





function message_generator(id) {

    return (ctx, language_code) => {

        let msg = new MESSAGE({

            ctx,
            language_code,
            proto   : TEXT[id]
        })

        return msg
    }
}





function collect_messages_from_text_map() {

    return Object.keys(TEXT).reduce((rv, i) => {

        Object.defineProperty(rv, i, {

            configurable    :false,
            enumerable      :true,
            writable        :false,
            value           :message_generator(i)
        })

        return rv

    }, Object.create(null))
}





function collect_actions_from_text_map() {

    return Object.values(TEXT)
        .filter(i => i.keyboard)
        .reduce((rv, i) => {

            i.keyboard.map(
                row => row.filter(i => !rv[i]).map(
                    button => rv[button] = new RegExp(`^\\{"${button}":.+\\}$`)
                )
            )

            return rv;

        }, Object.create(null));
}





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE EXPORTS ///////////////////////////////////////////////////////////////////////////////////

module.exports.actions = collect_actions_from_text_map();

module.exports.messages = collect_messages_from_text_map();

module.exports.decode_callback = function(ctx) {

    if (ctx.updateType === 'callback_query' && ctx.update.callback_query.data) {

        let data    = JSON.parse(ctx.update.callback_query.data);
        let action  = Object.keys(data)[0];
            data    = data[action];

        return {action, data};
    }

    return {};
}

module.exports.say = function(id, data, keyboard) {

    let messages = module.exports.messages;
    let msg = messages[id]

    if (!msg) throw `Speech item with id "${id}" doesn't exist`;
    if (data && typeof data !== 'function') data = () => data;
    if (keyboard && typeof keyboard !== 'function') keyboard = () => keyboard;

    return (ctx) => {

        let m = msg(ctx)
        if (data) m = m.with(data(ctx))
        if (keyboard) m = m.keyboard(keyboard(ctx))
        return m.say()
    }
}

module.exports.broadcast = function(telegram, msg) {

    if (!msg) return Promise.reject('msg parameter is mandatory')
    if (!msg.text) return Promise.reject('msg parameter should contain non-empty "text" property')
    if (!msg.targets) return Promise.reject('msg parameter should contain "targets" property')
    if (!Array.isArray(msg.targets)) return Promise.reject('msg parameter should contain "targets" property and it should be an array')

    let delay = 0;

    let result = {
        success: [],
        failure: [],
        slowdowns: [],
        id: msg.tag,
        count_ok: 0,
        count_err: 0,
        text: msg.text
    }

    function send(id, msg) {

        console.log(`\n\nBROADCAST: id=${msg.tag}, user=${id}, delay=${delay}\n`);

        return new Promise((resolve, reject) => setTimeout(() => {

            if (delay) {

                delay = delay*(1.05 + Math.random())
                resolve(send(id, msg))
            }

            else {

                let extra = EXTRA.HTML();

                if (Array.isArray(msg.buttons)) {

                    extra.markup(m => m.inlineKeyboard(

                        msg.buttons.map(x => x.map(y => y.url ? EXTRA.Markup.urlButton(y.text, y.url.replace('{id}', id)) : ( y.login ? EXTRA.Markup.loginButton(y.text, y.login) : EXTRA.Markup.callbackButton(y.text, y.data))  ))
                    ));
                }

                telegram
                    .sendMessage(id, msg.text, extra)
                    .then(msg => { 

                        result.success.push(id)
                        delay = 0
                        resolve(msg)
                    })
                    .catch(err => {

                        if (err && err.parameters && err.parameters.retry_after && parseInt(err.parameters.retry_after)) {

                            console.log(`SLOW DOWN REQUEST: ${err.parameters.retry_after}`)
                            err.userid = id
                            err.delay = delay
                            result.slowdowns.push(err)
                            delay = Math.max(delay, 1000 * (parseInt(err.parameters.retry_after) + 1))
                            resolve(send(id, msg))
                        }

                        trace.error({ broadcast: msg.tag, target_user: id, delay: delay}, err)
                        result.failure.push(id)
                        reject(err)
                    })
            }

        }), delay)
    }

    return new Promise((resolve) => msg
            .targets
            .reduce((acc, id) => acc.finally(() => send(id, msg).then(() => ++result.count_ok, () => ++result.count_err)), Promise.resolve())
            .then(() => resolve({ result, err: null }), err => resolve({ result, err }))
    )
}