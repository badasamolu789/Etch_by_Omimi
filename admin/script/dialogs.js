/* Accessible, promise-based dialogs. Destructive actions wait for confirmation. */
(() => {
    'use strict';
    let queue = Promise.resolve();
    let sequence = 0;
    function open(options) {
        const result = queue.then(() => new Promise(resolve => {
            const previousFocus = document.activeElement;
            const dialog = document.createElement('dialog');
            dialog.className = 'etch-dialog';
            const id = 'etch-dialog-' + ++sequence;
            const form = document.createElement('form');
            const eyebrow = document.createElement('p'); eyebrow.className = 'etch-dialog-eyebrow'; eyebrow.textContent = 'ETCH · ADMIN';
            const title = document.createElement('h2'); title.id = id; title.textContent = options.title || 'Please confirm';
            const message = document.createElement('p'); message.className = 'etch-dialog-message'; message.textContent = options.message || '';
            dialog.setAttribute('aria-labelledby', id);
            message.id = id + '-description'; dialog.setAttribute('aria-describedby', message.id);
            form.append(eyebrow, title, message);
            let input;
            if (options.input) {
                const label = document.createElement('label'); label.textContent = options.label || 'Your response';
                input = document.createElement(options.multiline ? 'textarea' : 'input');
                input.value = options.value ?? ''; input.required = options.required ?? true;
                if (!options.multiline) input.type = options.type || 'text';
                if (options.min !== undefined) input.min = options.min;
                if (options.max !== undefined) input.max = options.max;
                if (options.minLength !== undefined) input.minLength = options.minLength;
                if (options.maxLength !== undefined) input.maxLength = options.maxLength;
                if (options.multiline) input.rows = 4;
                input.readOnly = !!options.readOnly;
                label.append(input); form.append(label);
            }
            const actions = document.createElement('div'); actions.className = 'etch-dialog-actions';
            const finish = value => { dialog.close(); dialog.remove(); previousFocus?.focus?.(); resolve(value); };
            if (options.cancel !== false) {
                const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel';
                cancel.onclick = () => finish(null); actions.append(cancel);
            }
            if (options.readOnly && input) {
                const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = 'Copy link';
                copy.onclick = async () => {
                    try { await navigator.clipboard.writeText(input.value); copy.textContent = 'Copied'; }
                    catch { input.focus(); input.select(); copy.textContent = 'Select and copy the link'; }
                }; actions.append(copy);
            }
            const submit = document.createElement('button'); submit.type = 'submit'; submit.className = options.danger ? 'etch-dialog-danger' : 'etch-dialog-primary';
            submit.textContent = options.confirmText || 'Continue'; actions.append(submit); form.append(actions);
            form.onsubmit = event => { event.preventDefault(); if (form.reportValidity()) finish(input ? input.value : true); };
            dialog.oncancel = event => { event.preventDefault(); finish(null); };
            dialog.append(form); document.body.append(dialog); dialog.showModal();
            if (input) { input.focus(); if (options.readOnly) input.select(); }
            else (options.danger ? actions.querySelector('button') : submit).focus();
        }));
        queue = result.catch(() => {});
        return result;
    }
    window.EtchDialog = {
        open,
        alert: message => open({title:'Notice',message,cancel:false,confirmText:'Got it'}),
        confirm: message => open({title:'Confirm action',message,danger:/delete|remove/i.test(message),confirmText:/delete/i.test(message)?'Delete':'Confirm'}),
        prompt: (message,value='',options={}) => open({title:'Share article preview',message,value,input:true,...options}),
        share: (message,value) => open({title:'Private review link',message,value,input:true,readOnly:true,cancel:false,confirmText:'Done'})
    };
})();
