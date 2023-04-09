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

	return ctx.user.apartments.then(result => {

		if (result.length > 0) {

            /*let ids = result.filter(a => a.id > 528).map(a => a.id)

            if (result.filter(a => a.id > 528).length > 0) {

                if (ids.length > 0) {

                    ctx.reply(`Кв. ${ids.join(',')}:\nК сожалению, работы по Восточной башне уже завершены :(\nНо мы с радостью вернёмся к вам во время следующей мойки осенью, если соседи или УК её организуют.`)
                }

                else {

                    return ctx
                        .reply(`Кв. ${ids.join(',')}:\nК сожалению, работы по Восточной башне уже завершены :(\nНо мы с радостью вернёмся к вам во время следующей мойки осенью, если соседи или УК её организуют.`)
                        .finally(() => ctx.scene.leave())
                }
            }

            return ctx.db
                .query(`select apts.id, paylink from (select *, 'https://bots.secondfloor.cloud//request/'+id as paylink from wash_budget_2020_03 where intersect([${ids.join(',')}], apts.id).size()>0 and id != ${ctx.user.id} unwind apts)`)
                .then(result => {

                    if (result.length > 0) {

                        return messages
                            .wash_windows_multiple_requests(ctx)
                            .with({
                                apts: [... new Set(result.map(i => i.id))].join(','),
                                paylink: [... new Set(result.map(i => i.paylink))].join(" ,\n\n ") })
                            .reply()
                            .finally(() => ctx.scene.leave())
                    }

                    return messages
                        .wash_windows_invitation(ctx)
                        .keyboard({})
                        .reply()
                        .then(() => ctx.wizard.next(), () => ctx.scene.leave());
                })
            */

           return messages
                .wash_windows_invitation(ctx)
                .keyboard({})
                .reply()
                .then(() => ctx.wizard.next(), () => ctx.scene.leave());
		}

		return ctx
			.reply('Вы пока не зарегистрированы в шахматке. Пожалуйста, сначала отправьте мне номер вашей квартиры для регистрации')
			.finally(() => ctx.scene.leave());
	})
	.catch(trace.error);
}





/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////// Сцена приглашения к мытью окон

stepInvitation.action(actions.wash_windows_start, ctx => {

	return messages
		.wash_windows_agreement(ctx)
		.keyboard({})
		.reply()
        .then(() => ctx.wizard.next())
        .then(() => ctx.editMessageReplyMarkup())
});

stepInvitation.action(actions.wash_windows_cancel, ctx => {

	return ctx.reply("Ваш ответ: нет.\n\nОтвет принят.").then(() => ctx.scene.leave()).then(() => ctx.editMessageReplyMarkup())
});

stepInvitation.on('message', ctx => {

	return ctx.reply('Не, не понятно. Нажмите кнопку под сообщением выше');
});





/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////// Сцена соглашения с правилами

stepAgreement.action(actions.wash_windows_accept, ctx => {

	return ctx.user
		.get_apts()
		.then(trace.info)
		.then(stat => messages
			.wash_windows_budget(ctx)
			.with(stat)
			.keyboard({})
			.reply()
            .then(() => ctx.wizard.next()))
            .then(() => ctx.editMessageReplyMarkup())
		.catch(trace.error);
});

stepAgreement.hears(['Да', 'да', /\s*[Сс]оглаc(ен|на)\s*/], ctx => {

	return messages.wash_windows_budget(ctx).keyboard({}).reply().then(() => ctx.wizard.next()).then(() => ctx.editMessageReplyMarkup());
});

stepAgreement.action(actions.wash_windows_decline, ctx => {

	return ctx.reply("Ваш ответ: нет.\n\nОтвет принят.").then(() => ctx.scene.leave()).then(() => ctx.editMessageReplyMarkup());
});

stepAgreement.hears(['Нет', 'нет', 'Не', 'не'], ctx => {

	return ctx.reply("Ваш ответ: нет.\n\nОтвет принят.").then(() => ctx.scene.leave()).then(() => ctx.editMessageReplyMarkup());
});

stepAgreement.on('message', ctx => {

	return ctx.reply('Не понятно... нажмите на кнопку под условиями программы - да или нет');
});





/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////// Сцена бюджетирования

stepBudget.action(actions.wash_windows_cancel, ctx => {

	return ctx
		.reply('Ок, заявка отменена.')
        .finally(() => ctx.scene.leave())
        .then(() => ctx.editMessageReplyMarkup());
});

stepBudget.action(actions.wash_windows_budget_accept, ctx => {

    return ctx
        .reply('Ваш ответ: "Да, согласен"\n\nОтвет принят.')
        .then(() => ctx.user.update_wash_budget(860))
        .then(result => messages
                .wash_windows_budget_confirm(ctx)
                .with(result)
                .reply()
                .then(() => ctx.editMessageReplyMarkup())

        , err => {

            trace.error(err);
            return ctx
                .reply('Ой! Какая-то ошибка. Напишите, пожалуйста, @fedor_pavlov об этом')
                .then(() => ctx.editMessageReplyMarkup());
        })
        .finally(() => ctx.scene.leave());
})

stepBudget.use(ctx => {

	return messages
		.wash_windows_budget_unknown(ctx)
		.keyboard({})
        .reply()
});





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE EXPORTS ///////////////////////////////////////////////////////////////////////////////////

module.exports = new WizardScene(name, null,
	verifyRegistration,
	stepInvitation,
	stepAgreement,
	stepBudget);