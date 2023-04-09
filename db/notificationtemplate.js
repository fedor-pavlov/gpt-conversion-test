////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////// MODULE PREREQUISITS //////////////////////////////////////////////////////////////////////////////

const oRecord               = require("../../../odb/oRecord");





module.exports = class oNotificationTemplate extends oRecord {

    constructor() {

        super(...arguments);
    }

    buildMessage(obj) {

        return this.template.replace(/{([\w-_]+)(:[^}]+)?}/g, (_, parameter, modifiers) => {

            if (modifiers) {

                let me = this;

                return modifiers.match(/([\w-_]+)\s*(\(([^)]*)\))?/g).reduce((rv, f) => {

                    let m = f.match(/([\w-_]+)\s*(\(([^)]*)\))?/);
                    let func = m[1];
                    let opts = m[3];
                    return typeof me[func] == 'function' ? me[func](obj, parameter, rv, opts) : `${rv}(function ${func} is not defined)`;

                }, obj[parameter]);
            }

            return obj[parameter];
        });
    }

    bold(obj, parameter, value) {

        return `<b>${value}</b>`;
    }

    italic(obj, parameter, value) {

        return `<i>${value}</i>`;
    }

    yesno(obj, parameter, value, options) {

        let answers = options && options.split(',') || [];
        return value ? answers[0] || 'yes' : answers[1] || 'no';
    }

    onoff(obj, parameter, value, options) {

        return this.yesno(obj, parameter, value == 'on', options);
    }

    default(obj, parameter, value, options) {

        return value || options;
    }

    autohide(obj, parameter, value, options) {

        return value ? `${options}${value}\n` : '';
    }

    echo(obj, parameter, value, options) {

        return options;
    }

    url(obj, parameter, value, options) {

        let linkname = (options && obj[options]) || options || value;
        return value ? `<a href="${value}">${linkname}</a>` : linkname;
    }
}