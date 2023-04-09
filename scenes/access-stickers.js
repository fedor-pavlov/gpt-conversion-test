////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE PREREQUISITS //////////////////////////////////////////////////////////////////////////////

const { messages, actions }	= require('../speech');
const { SOURCE_ID		  } = require('../constants');
const 	name 				= module.filename.match(/\b([a-z0-9_-]+)\.js$/i)[1];
const   trace      			= require('../../../tracer').create({ title: `[SCENE ${name}]`, source: SOURCE_ID });

const 	WizardScene 		= require('telegraf/scenes/wizard');
const	Composer			= require('telegraf/composer');
const	stepInvitation		= new Composer();
const	stepAgreement		= new Composer();
const	stepBudget			= new Composer();





/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////// Сцена проверки регистрационных данных

function verifyRegistration(ctx) {

	if (!ctx.isPrivate) {

		return ctx.scene.leave();
    }

    trace.info(ctx.user.info);

	return ctx.user.apartments.then(result => {

		if (result.length > 0) {

            return messages
                .access_stickers_invitation(ctx)
                .keyboard({})
                .say()
                .then(() => ctx.wizard.next())
		}

		return ctx
			.reply('Вы пока не зарегистрированы в шахматке. Пожалуйста, сначала отправьте мне номер вашей квартиры для регистрации')
			.finally(() => ctx.scene.leave());
	})
	.catch(err => { trace.error(err); return ctx.scene.leave() });
}





/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////// Сцена приглашения к мытью окон

stepInvitation.action(actions.access_stickers_start, ctx => {

	return messages
		.access_stickers_agreement(ctx)
		.keyboard({})
		.reply()
		.then(() => ctx.wizard.next());
});

stepInvitation.action(actions.access_stickers_cancel, ctx => {

	return ctx.reply("Ваш ответ: нет.\n\nОтвет принят.").then(() => ctx.scene.leave());
});

stepInvitation.on('message', ctx => {

	return ctx.reply('Не, не понятно. Нажмите кнопку под сообщением выше');
});





/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////// Сцена соглашения с правилами

stepAgreement.action(actions.access_stickers_accept, ctx => {

    trace.info("CONDITIONS ACCEPTED", ctx.user.info);
	return messages
			.access_stickers_budget(ctx)
			.keyboard({})
			.reply()
			.then(() => ctx.wizard.next())
});

stepAgreement.hears(['Да', 'да', /\s*[Сс]оглаc(ен|на)\s*/], ctx => {

    trace.info("CONDITIONS ACCEPTED", ctx.user.info);
	return messages.access_stickers_budget(ctx).keyboard({}).reply().then(() => ctx.wizard.next());
});

stepAgreement.action(actions.access_stickers_decline, ctx => {

    trace.info("CONDITIONS DECLINED", ctx.user.info);
	return ctx.reply("Ваш ответ: нет.\n\nОтвет принят.").then(() => ctx.scene.leave());
});

stepAgreement.hears(['Нет', 'нет', 'Не', 'не'], ctx => {

    trace.info("CONDITIONS DECLINED", ctx.user.info);
	return ctx.reply("Ваш ответ: нет.\n\nОтвет принят.").then(() => ctx.scene.leave());
});

stepAgreement.on('message', ctx => {

    trace.info("UNKNOWN INPUT", ctx.message && ctx.message.text, ctx.user.info);
	return ctx.reply('Не понятно... нажмите на кнопку под условиями программы - да или нет');
});





/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////// Сцена бюджетирования

stepBudget.action(actions.access_stickers_cancel, ctx => {

	return ctx
		.reply('Ок, заказ отменён.')
		.finally(() => ctx.scene.leave());
});

stepBudget.action(actions.access_stickers_one,      place_order(1));
stepBudget.action(actions.access_stickers_two,      place_order(2));
stepBudget.action(actions.access_stickers_three,    place_order(3));
stepBudget.action(actions.access_stickers_five,     place_order(5));
stepBudget.action(actions.access_stickers_ten,      place_order(10));
stepBudget.hears(/^\s*\d+\s*$/, ctx => {

    let qty = parseInt(ctx.message.text.match(/(\d+)/)[1])
    return place_order(qty)(ctx)
})

stepBudget.use(ctx => {

	return messages
		.access_stickers_budget_unknown(ctx)
		.keyboard({})
		.reply();
});





function place_order(qty) {

    return (ctx) => ctx.user
        .order_acccess_stickers(qty)
        .then(result => {

            trace.info("ORDER", ctx.user.info, result['@data'] || result );
            return messages
                .access_stickers_budget_confirm(ctx)
                .with(result)
                .say()
                .then(() => setTimeout(() => ctx.reply(result.total_price), 100))
         }, err => {

            trace.error(err);
            return ctx.reply('Ой! Какая-то ошибка. Напишите, пожалуйста, @fedor_pavlov об этом');
         })
        .finally(() => ctx.scene.leave());
}





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE EXPORTS ///////////////////////////////////////////////////////////////////////////////////

module.exports = new WizardScene(name, null,
	verifyRegistration,
	stepInvitation,
	stepAgreement,
	stepBudget);