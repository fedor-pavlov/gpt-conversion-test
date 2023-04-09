////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE PREREQUISITS //////////////////////////////////////////////////////////////////////////////

const { uniq }              = require('../../../tools');
const { CLASSES }           = require('../constants');
const oDatabase             = require("../../../odb/oDatabase");
const TEMPLATE_USER         = { blocked: false, last_read: {news_chat: 0, news_zotov: 0, news_petition: 0} };
const oNotificationTemplate = require('./notificationtemplate');
const oChatInfo             = require('./chatinfo');
const oFlat                 = require('./flat');
const oMessage              = require('./message');
const oUser                 = require('./user');





////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE EXPORTS ///////////////////////////////////////////////////////////////////////////////////

module.exports = class oPresnyaDB extends oDatabase {

    constructor() {

        super(...arguments);
        this.log = typeof this.logger === 'function' && this.logger || this.trace;

        let presnya_class_map = {};
            presnya_class_map[CLASSES.USER] = oUser;
            presnya_class_map[CLASSES.FLAT] = oFlat;
            presnya_class_map[CLASSES.NEWS] = oMessage;
            presnya_class_map[CLASSES.ZOTOV] = oMessage;
            presnya_class_map[CLASSES.NICKY] = oMessage;
            presnya_class_map[CLASSES.PETITION] = oMessage;
            presnya_class_map[CLASSES.MESSAGE] = oMessage;
            presnya_class_map[CLASSES.ARCHIVE] = oMessage;
            presnya_class_map[CLASSES.TEMPLATE] = oNotificationTemplate;

        this._classmap = presnya_class_map;
    };



    async select_chats () {

        return this.select({from: CLASSES.CHAT}).then(chats => new oChatInfo(chats));
    };



    async select_user_byID (uid) {

        return this.select_one({select: "*, out('owned') as property", from: CLASSES.USER, where: {id: uid}});
    };



    async select_user (ctx) {

        let uid = (ctx.from && ctx.from.id) || (ctx.message && ctx.message.from.id) || -1;
        let cid = (ctx.chat && ctx.chat.id) || (ctx.message && ctx.message.chat.id) || -1;

        return this.select_one({from: CLASSES.USER, where: {id: uid}}).then(user => {

            if (user) {

                user.update_info(ctx);
                return user;
            };

            return this.template(CLASSES.USER).then(proto => {

                let data = Object.assign(proto, TEMPLATE_USER, {id: uid, chat: cid});

                return this.create_vertex(CLASSES.USER, data).then(user => {

                    this.log("NEW USER =", ctx.from, ctx.chat);

                    if (user) {

                        user.update_info(ctx);
                        return user;
                    };

                    this.log("ERROR: create_vertex result is undefined, while a new user object is expected");
                });
            });
        });
    };



    async select_flat(id) {

        return this.select_one({select: "*, tower:{*}, type:{*}", from: CLASSES.FLAT, where: {id: id}}).then(flat => {

            if (flat) return flat;

            return this.select_one({from: CLASSES.FLAT, where: {id: 0}}).then(flat => {

                this.log("FAKE APPARTMENT =", flat);
                if (flat) return new oFlat(this, flat);
                this.log("ERROR: select result is undefined, while a new flat object is expected");
            });
        });
    };



    async select_neighbours(flats, directions = ["out('stack')", "in('stack')", "both('floor')"]) {

        if (!flats) return;
        if (!Array.isArray(flats)) flats = [flats];
        if (!flats.length) return;
        flats = `[${flats.map(i => i.toString()).join(',')}]`;

        return this.query(`
            select *, user.id as user_id, tower+'.'+floor+'.'+user.id as id from (
                select tower.name as tower, floor, id as apt, in_owned.out:{*} as user from (
                    select expand(unionall(
                        ${directions.map(i => `(traverse ${i} from ${flats})`).join(',')}
                    ))
                )
                where @rid not in ${flats} and in_owned.size() > 0
                order by floor
                unwind user
            )
        `)
        .then(nbs => {

            return uniq(nbs).map(n => {

                return ['tower', 'floor', 'apt'].reduce((pv, i) => {

                    pv[i] = n[i];
                    return pv;

                }, new oUser(this, n.user));
            });
        });
    };



    async select_neighbours_tower(flats) {

        if (!flats) return;
        if (!Array.isArray(flats)) flats = [flats];
        if (!flats.length) return;
        flats = `[${flats.join(',')}]`;

        return this.query(`
            select *, user.id as user_id, tower+'.'+floor+'.'+user.id as id from (
                select tower.name as tower, floor, id as apt, in_owned.out:{*} as user from (
                    select from ${CLASSES.FLAT} where tower in (
                        select distinct tower from ${flats}
                    )
                )
                where @rid not in ${flats} and in_owned.size() > 0
                order by floor
                unwind user
            )
        `)
        .then(nbs => {

            return uniq(nbs).map(n => {

                return ['tower', 'floor', 'apt'].reduce((pv, i) => {

                    pv[i] = n[i];
                    return pv;

                }, new oUser(this, n.user));
            });
        });
    };



    async select_notification_template(tag) {

        return this.select_one({from: CLASSES.TEMPLATE, where: ":tag in tags"}, {tag: tag}).then(result => {

            this.log(`SELECT NOTIFICATION TEMPLATE [tag = ${tag}]`, { template: result });
            return result;
        });
    };



    async select_messages(className, ts) {

        return this.select({ from: className, where: "pinned_on >= :last_read", order: "date"}, { last_read: (ts || 0) }).then(result => {

            this.log(`SELECT MESSAGES [class = ${className}]`, { count: result.length, since: ts });
            return result;
        });
    };



    async select_messages(className, ts) {

        return this.select({ from: className, where: "pinned_on >= :last_read", order: "date"}, { last_read: (ts || 0) }).then(result => {

            this.log(`SELECT MESSAGES [class = ${className}]`, { count: result.length, since: ts });
            return result;
        });
    };



    async insert_message(className, msg, pinned_by) {

        let data = ['message_id', 'date', 'text', 'chat', 'reply_to_message'].reduce((o, i) => { o[i] = msg[i]; return o }, {});
            data = ['photo', 'document'].filter(i => msg[i]).reduce((o, i) => { o[i] = Array.isArray(msg[i]) ? msg[i].reduce((rv, x) => { return (rv.file_size && rv.file_size > x.file_size) ? rv : x }, {}) : msg[i]; return o; }, data);
            data.sender = msg.from;
            data.pinned_by = pinned_by;
            data.pinned_on = Date.now();
            data.webflow = null;

        if (className == CLASSES.ARCHIVE) {

            return this.insert(className, data);
        }

        return this.select_one({from: className, where: {"chat.id": data.chat.id, message_id: data.message_id}}).then(result => {

            if (result) {

                this.log(`THIS MESSAGE HAS BEEN ALREADY STORED`, {input: data, current_record: result['@data']});
                return result;
            };

            return this.insert(className, data).then(result => {

                this.log(`MESSAGE IS STORED [class = ${className}]`, { by: pinned_by, record: result['@data'] || result });
                return result;
            });

        }).catch(this.log);
    };



    async create_uniq_offer(user, amount, dispersion) {

        let offer = Math.round(100*(amount + (0.5-Math.random())*dispersion));

        return this.select({from: CLASSES.MONEY}).then(money => {

            if (money && money.length > 0) {

                money = new Set(money.map(i => i.id));
                while (money.has(offer)) ++offer;
            };

            return this.create_vertex(CLASSES.MONEY, { id: offer, amount: offer/100.00 }).then(offer => {

                return this.create_edge(CLASSES.OFFER, user._rid, offer._rid, {ts: Date.now()}).then(e => {

                    this.log("OFFER IS CREATED", user['@data'], offer['@data'], e['@data']);
                    return offer;
                });
            });

        }).catch(this.log);
    };



    async select_uniq_offer(user, amount, dispersion) {

        return this.select({ select: `expand(out("${CLASSES.OFFER}"))`, from: user._rid }).then(offers => {

            if (offers && offers.length === 1) {

                return offers[0];
            }

            if (offers && offers.length > 1) {

                this.log("THE USER HAS MULTIPLE OFFERS!", user, offers);
                throw `User [id=${user.id}] has multiple offers!`;
            }

            return this.create_uniq_offer(...arguments);

        }).then(offer => {

            return this.query(`select ts, inV():{*} as debitor from (select expand(outE("${CLASSES.CREDIT}")) from ${offer._rid})`).then(credits => {

                if (credits && credits.length > 1) {

                    this.log("OFFER HAS MULTIPLE DEBITORS!", offer, credits);
                }

                if (credits && credits.length > 0) {

                    offer.recieved = true;
                    offer.recieved_on = credits[0].ts;
                    offer.recieved_by = new oUser(this, credits[0].debitor);
                }

                return offer;
            });

        }).catch(this.log);
    };



    async insert_credit(debitor, offer_id) {

        this.log("insert, REQUESTED OFFER ID:", offer_id);

        return this.select({from: CLASSES.MONEY, where: {id: offer_id}}).then(offers => {

            if (offers && offers.length === 1) {

                return offers[0];
            }

            if (offers && offers.length > 1) {

                this.log("THERE ARE MULTIPLE OFFERS WITH THE SAME ID", offers);
                throw `Multiple Offers [id = ${offer_id}]`;
            }

            this.log("OFFER IS NOT FOUND", offer_id);
            throw `Offer [id = ${offer_id}] is not found`;
        })
        .then(offer => {

            if (!offer) return;

            return this.query(`select expand(out("${CLASSES.CREDIT}")) from ${offer._rid}`).then(debitors => {

                if (debitors && debitors.length > 0) {

                    throw `Offer [id = ${offer_id}] has aready got a debitor`;
                }

                return this.create_edge(CLASSES.CREDIT, offer._rid, debitor._rid, {}).then(credit => {

                    this.log("CREDIT IS CREATED", offer_id, offer, debitor, credit);

                    return this.query(`select expand(in("${CLASSES.OFFER}")) from ${offer._rid}`).then(creditors => {

                        if (creditors && creditors.length === 1) {

                            return creditors[0];
                        }

                        if (creditors && creditors.length > 1) {

                            this.log("THERE ARE MULTIPLE CREDITORS FOR AN OFFER", offers['@data']);
                            throw `Offer [id = ${offer_id}] has multiple creditors!`;
                        }

                        this.log("CREDITOR IS NOT FOUND", offer['@data']);
                        throw `Offer [id = ${offer_id}] is not found`;

                    }).then(creditor => {

                        return {success: true, offer: offer, creditor: creditor};
                    
                    }).then(result => {

                        return this.query(`select *, $c as credit from ${CLASSES.USER} let $c=sum(in("${CLASSES.CREDIT}").amount) where in_${CLASSES.CREDIT}.size()>0 order by $c desc`).then(cash => {

                            result.cash = cash;
                            return result;

                        }).catch(err =>{

                            result.cash = [];
                            result.err = err;
                            return result;
                        });
                    });
                });
            });
        });
    };

    async upsert_wash_budget(user_rid, budget) {

        return this
            .get_apts_stat(user_rid)
            .then(stat => this.get_uniq_pay_id(500, CLASSES.WASH_BUDGET, 'uniq_pay_id').then(pay_id => this.upsert(CLASSES.WASH_BUDGET, {

                    id              : stat.id,
                    user            : user_rid,
                    apts            : stat.apt_rids,
                    budget          : budget * stat.window_count,
                    budget_per_sqm  : 0,
                    window_count    : stat.window_count,
                    window_sqm      : 0,
                    confirmation    : "auto",
                    base_price      : 850,
                    uniq_pay_id     : pay_id

                }, {id: stat.id}, 'after *, apts.id as apt_ids, (base_price + uniq_pay_id/100) as unit_price, ((base_price + uniq_pay_id/100) * window_count) as total_price')
            ))
    }

    async select_wash_budget(user_rid) {

        return this
            .select_one({select: "*, apts.id as apt_ids", from: CLASSES.WASH_BUDGET, where:{user: user_rid}})
    }

    async get_apts_stat(user_rid) {

        return this
            .query_one(`select id, list($a.id) as apts, $a as apt_rids, $w as windows, $c as window_count, $c*860 as budget from ${user_rid} let $a = set(out('${CLASSES.OWNER}').@rid), $w = list($a.windows), $c = $w.size()`)
    }

    async correct_wash_budget(user_rid, budget) {

        return this
            .select_one({from: CLASSES.WASH_BUDGET, where:{user: user_rid}})
            .then(result => this.update(result._rid, {budget: budget * result.window_count }))
    }

    async get_uniq_pay_id(population_size, dbClass, dbProperty) {

        let db = this

        const try_new_id = (resolve) => {

            let id = Math.round(2 * population_size * Math.random())
            db
                .select({from: dbClass, where: {[dbProperty]: id}})
                .then(result => result.length === 0 ? resolve(id) : try_new_id(resolve))
        }

        return new Promise(try_new_id)
    }

    async order_acccess_stickers(user, qty, apts) {

        return this
            .get_uniq_pay_id(500, CLASSES.STICKERS, 'uniq_pay_id')
            .then(pay_id => this.upsert(CLASSES.STICKERS, {

                id              : user.id,
                user            : user._rid,
                apts            : apts.map(i => i._rid),
                apt             : apts[0] && apts[0]._rid,
                qty             : qty,
                uniq_pay_id     : pay_id

            }, {id: user.id, payed: false}, 'after *, apt:{*}, base_price as unit_price, (base_price * qty + uniq_pay_id/100) as total_price')
        )
    }

    async select_neighbours_same_floor(user) {

        // and entrance = $parent.$current.entrance

        return this.query(

            `select tower, floor, set(owners):{*} as owners from (
                select expand($same_floor) as apts from apartment
                let	$same_floor = (select tower.name as tower, floor, id, in("owned") as owners from apartment where in("owned").size() > 0 and id != $parent.$current.id and tower = $parent.$current.tower and floor = $parent.$current.floor)
                where ${user._rid} in in("owned")
                unwind apts)
            group by tower, floor`
        )
        .then(result => { 
  
            result.forEach(floor => floor.owners = floor.owners.map(i => new oUser(this, i)))
            return result;
        })
    }

    async register_santa(user) {

        return this.insert(CLASSES.SANTA, { id: user.id, user: user._rid })
    }

    async santa_get_peer(user) {

        return this
            .query_one(`select user:{*}, user.out_owned[0].in:{id, tower:{name}} as apt from ${CLASSES.SANTA} where peer_id = ${user.id}`)
            .then(peer => {

                if (peer && peer.user && peer.user.id) {

                    this.log('SANTA_GET_PEER: peer already exists', user, peer)
                    peer.user = new oUser(this, peer.user)
                    return peer
                }

                return this
                    .command(`update ${CLASSES.SANTA} set peer = ${user._rid}, peer_id = ${user.id} return after user:{*}, user.out_owned[0].in:{id, tower:{name}} as apt where peer is null and id != ${user.id} limit 1`)
                    .then(peer => {

                        this.log('SANTA_GET_PEER: new peer is registered', user, peer)
                        peer = peer[0]
                        peer.user = new oUser(this, peer.user)
                        return peer
                    })
            })
    }
}