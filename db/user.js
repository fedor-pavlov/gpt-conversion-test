////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE PREREQUISITS //////////////////////////////////////////////////////////////////////////////

const { uniq }          = require('../../../tools');
const { CLASSES }       = require('../constants');
const oRecord           = require("../../../odb/oRecord");
const { useTemplate }   = require('object-to-text');
const toURL             = useTemplate('<a href="tg://user?id={id}">{username:{$} (}{firstname:{$} }{lastname:{$}}{username:)}</a>')

const REASON_FAKE       = "FAKE_APARTMENT";
const REASON_WRONG      = "WRONG_ANSWER";
const REASON_LIMIT      = "FAILURE_LIMIT";
const REASON_LIMIT_TTL  = "FAILURE_LIMIT_TOTAL";
const REASON_SUCCESS    = "SUCCESS";
const REASON_SUCCESS_E  = "SUCCESS_BUT_WITH_ERROR";
const LIMIT_FLAT        = 2;
const LIMIT_TOTAL       = 5;





function getter(obj, name, initial_value = null, writable = true) {

    let internal_var = "@" + name;

    Object.defineProperty(obj, internal_var, {

        configurable: false,
        enumerable: false,
        writable: writable,
        value: initial_value
    });


    Object.defineProperty(obj, name, {

        get: function () { return this[internal_var] }
    });
};





module.exports = class oUser extends oRecord {

    constructor() {

        super(...arguments);
        this.$id = this.id;
        this.$name = this.name;
        this.$blocked = this.blocked;
        if (this._rid) {
            getter(this, "apartments", this._update_apartments());
            getter(this, "confirmations", this._update_confirmations());
        };

        this['@description'] = {

            id          : 'id',
            name        : 'name',
            username    : 'username',
            firstname   : 'F-name',
            lastname    : 'L-name',
            link        : 'chat'
        }
    }

    async _update_apartments() {

        return this._db.query(`select *, tower:{*}, type:{*} from (select expand(out('${CLASSES.OWNER}')) from ${this._rid})`).then(result => {

            return uniq(result);
        });
    }

    async _update_confirmations() {

        return this._db.query(`select *, tower:{*}, type:{*} from (select expand(out('${CLASSES.CONFIRM}')) from ${this._rid})`).then(result => {

            return uniq(result);
        });
    }

    async _write_attemp(apt, reason) {

        let data = {
            ts: Date.now(),
            reason: reason
        }

        return this._db.create_edge(CLASSES.FAILURE, this._rid, apt, data).then(e => {

            this._db.trace("FAILED ATTEMPT IS REGISTERED =", e);
        });
    }

    async _retrieve_messages(className, all = false) {

        let ts = !all && this.last_read && this.last_read[className] || 0;

        return this._db.select_messages(className, ts).then(result => {

            if (result && result.length) {

                let tsObj = Object.assign({}, this.last_read);
                    tsObj[className] = Date.now();

                this.last_read = tsObj;
            }

            return result;
        });
    }

    async _save_message(className, msg) {

        let pinned_by = ['id', 'name', 'username', 'lastname', 'firstname'].reduce((rv, i) => { rv[i] = this[i]; return rv }, {});
        return this._db.insert_message(className, msg, pinned_by);
    }

    get name() {

        let fname = this.firstname && this.firstname.trim() || '';
        let lname = this.lastname  && this.lastname.trim()  || '';
        let uname = this.username  && this.username.trim()  || '';
        let name  = [fname, lname].join(' ');
        switch (name.length) {
            case 0: return uname ? `@${uname}` : `аноним (${this.id})`;
            case 1: return uname ? `@${uname}` : `${name} (${this.id})`;
            default: return name;
        }
    }

    get link() {

        return toURL(this);
        //return this.username ? `@${this.username}` : `<a href="tg://user?id=${this.id}">${this.name}</a>`;
    }

    async make_offer(amount, dispersion) {

        return this._db.select_uniq_offer(this, ...arguments);
    }

    async take_credit(offer_id) {

        return this._db.insert_credit(this, ...arguments);
    }

    async update_info(ctx) {

        console.log("UPDATE USER PHOTO:", "from =", ctx.from, "this.photo_url =", this.photo_url)

        this.firstname  = ctx.from.first_name;
        this.lastname   = ctx.from.last_name;
        this.username   = ctx.from.username;
        this.photo_url  = ctx.from.photo_url;
        if (ctx.chat.type === 'private') { this.chat = ctx.chat.id };
        return this._jobs;
    }

    async retrieve_news(all = false) {

        return this._retrieve_messages(CLASSES.NEWS, all);
    }

    async retrieve_zotov(all = false) {

        return this._retrieve_messages(CLASSES.ZOTOV, all);
    }

    async retrieve_petition(all = false) {

        return this._retrieve_messages(CLASSES.PETITION, all);
    }

    async save_archive(msg) {

        return this._save_message(CLASSES.ARCHIVE, msg);
    }

    async save_news(msg) {

        return this._save_message(CLASSES.NEWS, msg);
    }

    async save_zotov(msg) {

        return this._save_message(CLASSES.ZOTOV, msg);
    }

    async save_nicky(msg) {

        return this._save_message(CLASSES.NICKY, msg);
    }

    async save_petition(msg) {

        return this._save_message(CLASSES.PETITION, msg);
    }

    async write_acceptance(apt_id, data) {

        return this.apartments.then(apts => {

            let apt = apts.filter(i => {return apt_id == i.id});

            if (apt && apt.length > 0) {

                apt = apt[0];

                return this._db.create_edge(CLASSES.CONFIRM, this._rid, apt._rid, data).then(edge => {

                    this['@confirmations'] = this._update_confirmations();
                    return { success: true, record: edge['@data'] }
                });
            }

            else {

                return { success: false, reason: `can't find an apartment with id = ${apt_id}` };
            };
        });
    }

    get neighbours() {

        return this.apartments.then(apts => {

            return this._db.select_neighbours(apts.map(i => i._rid));
        });
    };

    get neighbours_floor() {
        
        return this.apartments.then(apts => {

            return this._db.select_neighbours(apts.map(i => i._rid), ["both('floor')"]);
        });
    };

    get neighbours_stack() {

        return this.apartments.then(apts => {

            return this._db.select_neighbours(apts.map(i => i._rid), ["in('stack')", "out('stack')"]);
        });
    };

    get neighbours_tower() {

        return this.apartments.then(apts => {

            return this._db.select_neighbours_tower(apts.map(i => i._rid));
        });
    };

    async register(apt, answer) {

        let trace = (...input) => { this._db.log(`REGISTRATION [${apt}]:`, this, ...input); }

        trace(`starting registration process with user input = [${answer}]`);

        return this._db.select_flat(apt).then(flat => {

            if (flat.id > 0) {

                return this._db.select({select: "in.id as id", from: CLASSES.FAILURE, where: {out: this._rid}}).then(select => {

                    let limit_count_total   = select ? select.length : 0;
                    let limit_count         = select ? select.filter(i => {return i.id == flat.id}).length : 0;

                    if (limit_count_total >= LIMIT_TOTAL) {

                        this._write_attemp(flat._rid, {category: REASON_LIMIT_TTL, count: limit_count_total, limit: LIMIT_TOTAL});
                        trace(`failed due to total failures limit violation (${limit_count_total} vs ${LIMIT_TOTAL})`);
                        return { success: false, continue: false, reason: REASON_LIMIT_TTL };
                    }

                    if (limit_count >= LIMIT_FLAT) {

                        this._write_attemp(flat._rid, {category: REASON_LIMIT, count: limit_count, limit: LIMIT_FLAT});
                        trace(`failed due to failure per apartment limit violation (${limit_count} vs ${LIMIT_FLAT})`);
                        return { success: false, continue: false, reason: REASON_LIMIT };
                    }

                    if (answer != flat.windows.length) {

                        this._write_attemp(flat._rid, {category: REASON_WRONG, answer: answer, check: flat.windows.length});
                        trace(`failed due to wrong security check (${answer} vs ${flat.windows.length})`);
                        return { success: false, continue: ++limit_count < LIMIT_FLAT && ++limit_count_total < LIMIT_TOTAL, reason: REASON_WRONG };
                    }

                    return this._db.create_edge(CLASSES.OWNER, this._rid, flat._rid, {

                        ts: Date.now(),
                        proof: answer,
                        check: flat.windows.length

                    }).then(e => {

                        this['@apartments'] = this._update_apartments();
                        this['@data']['@apt_count'] = (this['@data']['@apt_count'] || 0) + 1;
                        trace("success", e['@data'] || e);

                        let result = { success: true, continue: true, user: this, flat: flat, reason: REASON_SUCCESS };

                        result.owners = flat.owners.then(o => {

                            return o.filter(i => { return i.id != this.id });
                        });

                        result.neighbours = flat.neighbours.then(n => {

                            return n.filter(i => { return i.id != this.id });
                        });

                        return Promise.all([result.owners, result.neighbours]).then(res => {

                            trace("owners and neighbours", ...res);
                            return result;
                        })
                        .catch(err => {

                            trace("failed to get other owners of the apartment", err);
                            result.err = err.message;
                            result.reason = reason = REASON_SUCCESS_E;
                            return result;
                        })
                    })
                    .catch(err => {

                        trace("failed due to exception", err);
                        return { success: false, continue: true, reason: 'ERROR', flat: flat, err: err.message }
                    });
                });
            }

            else {

                this._write_attemp(flat, {category: REASON_FAKE, input: apt, check: flat});
                trace(`fake apartment`);
                return { success: false, continue: false, reason: REASON_FAKE }
            };
        });
    };

    async update_wash_budget(budget) {

        return this._db.upsert_wash_budget(this._rid, budget);
    };

    async get_apts() {

        return this._db.get_apts_stat(this._rid);
    };

    async get_wash_budget() {

        return this._db.select_wash_budget(this._rid);
    };

    async correct_wash_budget(budget) {

        return this._db.correct_wash_budget(this._rid, budget)
    };

    async order_acccess_stickers(qty) {

        return this.apartments.then(apts => this._db.order_acccess_stickers(this, qty, apts))
    };
};