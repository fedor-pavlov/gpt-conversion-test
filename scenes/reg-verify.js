////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE PREREQUISITS //////////////////////////////////////////////////////////////////////////////

const { messages	  	  }	= require('../speech');
const { SOURCE_ID,
		SETTINGS 		  } = require('../constants');
const { uniq, groupBy	  } = require('../../../tools');
const 	name 				= module.filename.match(/\b([a-z0-9_-]+)\.js$/i)[1];
const   trace      			= require('../../../tracer').create({ title: `[SCENE ${name}]`, source: SOURCE_ID });
const	HTML				= require('telegraf/extra').HTML();
const 	Scene 				= require('telegraf/scenes/base');
const 	Markup				= require('telegraf/markup');
const	scene_reg_verify 	= new Scene(name);
const	support				= `@fedor_pavlov`
const   supportA	        = (link) => `<a href="tg://user?id=${SETTINGS.support_id}">${link || support}</a>`;
const { toText }            = require('object-to-text');
const { pivot }             = require('nice-pivot');





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// OBSOLETE DEPENDCIES //////////////////////////////////////////////////////////////////////////////

const BOT_MENU = `
/stack - соседи в том же стояке (над и под вами)
/floor - соседи по этажу
/tower - соседи в вашей башне
/menu  - все функции бота`;

const BOT_WHATS_NEXT = `Нажмите /menu, чтобы увидеть списко всех функций бота`;

function buildNeighboursHTML(arr, titleMessage = "", defaultMessage = "<i>(соседи не найдены)</i>") {

	if(!arr) return defaultMessage;
	if(!Array.isArray(arr)) return defaultMessage;
    if(!arr.length) return defaultMessage;
    

	let msg = [titleMessage];

	groupBy(arr, "tower", "floor").forEach((t, name) => {

		msg.push(`<b>${name}:</b>`);

		t.forEach((f, name) => {

			msg.push(`<b>${name} эт:</b> ${Array.from(f.values()).map(i => i.link).join(', ')}`);
		})
	});

	return msg.join("\n");
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////// Сцена проверки регистрационных данных

scene_reg_verify.enter(ctx => {

	if (ctx.session.reg.id > 0) {

		ctx.session.reg.attempt = 0;
		ctx.reply(`Подскажите, пожалуйста, сколько окон в квартире ${ctx.session.reg.id}?`);
	}
	else {

		trace.info("SCENE [reg-verify]: ctx session doesn't contain appartment number!", ctx.session, ctx.user);
		ctx.scene.leave();
	}
});

scene_reg_verify.hears(/\d+/i, ctx => {

	return ctx.user.register(ctx.session.reg.id, ctx.message.text).then(result => {

		trace.info("REGISTRATION: result", result, ctx.user);

		if (result.success) {

			ctx.scene.leave();

			return ctx.reply('Спасибо. Квартира успешно зарегистрирована').then(() => {

				return result.neighbours.then(nbs => {

					uniq(nbs).forEach(u => {

						if (u.id != u.chat) {

							trace.error('AN OWNER DOES NOT HAVE PRIVATE CHAT ID', u);
							u.chat = u.id;
						}

						else {

							ctx.telegram.sendMessage(
								u.id,
								`У вас появился новый сосед! - ${result.flat.floor == u.floor ? 'прямо на вашем этаже' : 'в вашем стояке'}:\n<b>${result.flat.tower.name} башня,</b>\n<b>${result.flat.floor} эт:</b> ${ctx.user.link}`,
								HTML
							)
							.catch(trace.info);
						}
                    });

                    let info = nbs.length > 0 ? 'Ваши соседи по этажу и по стояку:' + toText(pivot(nbs,

                        {tower: {

                            tower  : (group, groupName) => groupName,
                            floors : (group) => group
                        }},

                        {floor: {

                            floor: (group, groupName) => groupName,
                            users: (group) => group.toArray().map(u => u.link)
                        }})

                    , "\n\n<b>{tower}</b>{floors:\n<b>{floor}</b> эт.: {users:join(, )}}") : '<i>Пока никто из ближайших к Вам соседей не зарегистрировался в шахматке. Как только они появятся, я сразу же сообщу Вам об этом.</i>'

					return ctx.replyWithHTML(info);

				}, trace.info)

				.then(() => {

					let owners = result.owners;
					if (!owners) return;
					if (!owners.length) return;

					owners.forEach(u => {

						ctx.telegram.sendMessage(
							u.chat,
							`В вашей квартире №${result.flat.id} зарегистрировался новый жилец:\n${ctx.user.link}\n\n<i>Если Вы находите в этом какую-то ошибку или усматриваете подозрительное действие, пожалуйста, сообщите об этом в</i> ${supportA('поддержку')}`,
							HTML)
						.catch(trace.info);
					});

					return ctx.replyWithHTML(`В вашей квартире также зарегистрирован${owners.length > 1 ? 'ы' : ''}:\n${owners.map(i => i.link).join('\n')}\n\n<i>Если Вы находите в этом какую-то ошибку или усматриваете подозрительное действие, пожалуйста, сообщите об этом в</i> ${supportA('поддержку')}`).catch(trace.info);

				}, trace.info)

				.then(() => {

                    return ctx.reply("Что я умею:", Markup.inlineKeyboard([

                        [Markup.callbackButton("Соседи по этажу",				"/floor")],
                        [Markup.callbackButton("Соседи по стояку",				"/stack")],
                      //[Markup.callbackButton("Соседи в башне",				"/tower")],
                        [Markup.callbackButton("Добавить квартиру",				"/join" )],
                        [Markup.callbackButton("Закрытый чат",					"/confirm")],
                        [Markup.callbackButton("Список всех чатов Пресня Сити", "/chats")],
                        [Markup.callbackButton("Помыть окна альпинистами",      "/okna")]

                    ]).extra());
				});
			});
		}
		else {

			if (result.continue) {

				ctx.session.reg.attempt++;
				return ctx.reply('Не-а, нужно указать точное число окон.');
			}
			else {

				ctx.scene.leave();
				return ctx.reply(`Извиняюсь, регистрация заблокирована.\nОбратитесь, пожалуйста, к ${support} за поддержкой.`);
			}
		};
	})
	.catch(err => {

		ctx.scene.leave();
		trace.info("REGISTRATION ERROR", err, ctx.user);
		return ctx.reply(`Хммм.. произошла досадная ошибка при регистрации. Будьте добры, сообщите об этом ${support}\nСпасибо!\n\n${err}`);
	});
});

scene_reg_verify.on('message', ctx => {

	ctx.session.reg.attempt++;
	if (ctx.session.reg.attempt >= 2) {

		ctx.reply('Ладно, в следующий раз попробуете.');
		ctx.scene.leave();
	}
	else {

		ctx.reply(`Хммм... "${ctx.message.text}" - не похоже на число окон. Введите цифры - без пробелов, текста и прочего.`);
	}
});

scene_reg_verify.use(ctx => trace.info('UNEXPECTED_INPUT', ctx.update || ctx.message, ctx.user));





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE EXPORTS ///////////////////////////////////////////////////////////////////////////////////

module.exports = scene_reg_verify