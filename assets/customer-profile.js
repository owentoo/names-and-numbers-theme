(function () {
  var form = document.querySelector('[data-profile-form]');

  if (!form) {
    return;
  }

  var submitButton = form.querySelector('[data-submit-button]');
  var submitButtonText = submitButton ? submitButton.querySelector('[data-submit-button-text]') : null;
  var statusNode = form.querySelector('[data-form-status]');
  var modal = document.querySelector('[data-profile-modal]');
  var successWrapNode = modal ? modal.querySelector('.profile-addr-success-wrap') : document.querySelector('.profile-addr-success-wrap');
  var actionsNode = form.querySelector('.profile-addr-form__actions');
  var pageBlocker = document.querySelector('[data-profile-page-blocker]');
  var blockerStatusNode = pageBlocker ? pageBlocker.querySelector('[data-blocker-status]') : null;
  var blockerSpinner = pageBlocker ? pageBlocker.querySelector('[data-blocker-spinner]') : null;
  var endpoint = '/apps/profile-api/customer/update';
  var successMessage = 'Email/phone number updated. Changes may take a few seconds to appear in your Members Portal';
  var closeTimer = null;
  var shouldReloadOnClose = false;

  function ensureStatusNode() {
    if (statusNode) {
      return statusNode;
    }

    statusNode = document.createElement('div');
    statusNode.className = 'profile-addr-msg';
    statusNode.setAttribute('data-form-status', '');
    statusNode.setAttribute('aria-live', 'polite');
    statusNode.hidden = true;

    if (actionsNode && actionsNode.parentNode) {
      actionsNode.insertAdjacentElement('afterend', statusNode);
    } else {
      form.appendChild(statusNode);
    }

    return statusNode;
  }

  function ensureSuccessWrapNode() {
    if (successWrapNode) {
      return successWrapNode;
    }

    successWrapNode = document.createElement('div');
    successWrapNode.className = 'profile-addr-success-wrap';
    successWrapNode.hidden = true;

    if (modal) {
      var modalInner = modal.querySelector('.nt-profile-modal__inner');

      if (modalInner) {
        var headerNode = modalInner.querySelector('.nt-profile-modal__header');

        if (headerNode) {
          headerNode.insertAdjacentElement('afterend', successWrapNode);
        } else {
          modalInner.insertAdjacentElement('afterbegin', successWrapNode);
        }
      } else {
        form.insertAdjacentElement('beforebegin', successWrapNode);
      }
    } else {
      form.insertAdjacentElement('beforebegin', successWrapNode);
    }

    return successWrapNode;
  }

  function clearErrors() {
    form.querySelectorAll('[data-error-for]').forEach(function (node) {
      node.textContent = '';
    });
  }

  function setStatus(message, type) {
    var successNode = ensureSuccessWrapNode();
    var node = ensureStatusNode();

    if (!node) {
      return;
    }

    if (successNode) {
      successNode.textContent = '';
      successNode.hidden = true;
    }

    node.textContent = message || '';
    node.classList.remove('is-error', 'is-success');
    node.hidden = !message;

    if (type) {
      node.classList.add(type === 'error' ? 'is-error' : 'is-success');
    }

    if (message && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function setSuccessMessage(message) {
    var successNode = ensureSuccessWrapNode();
    var node = ensureStatusNode();

    if (!successNode) {
      setStatus(message, 'success');
      return;
    }

    if (node) {
      node.textContent = '';
      node.classList.remove('is-error', 'is-success');
      node.hidden = true;
    }

    successNode.textContent = message || '';
    successNode.hidden = !message;

    if (message && typeof successNode.scrollIntoView === 'function') {
      successNode.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function setLoading(isLoading) {
    if (!submitButton) {
      return;
    }

    submitButton.disabled = isLoading;
    submitButton.setAttribute('aria-busy', isLoading ? 'true' : 'false');

    if (submitButtonText) {
      submitButtonText.textContent = 'Save Profile';
    }
  }

  function setBlockerState(isVisible, message, type, showSpinner) {
    if (!pageBlocker || !blockerStatusNode) {
      return;
    }

    if (isVisible) {
      if (typeof pageBlocker.showModal === 'function' && !pageBlocker.open) {
        pageBlocker.showModal();
      }
    } else if (typeof pageBlocker.close === 'function' && pageBlocker.open) {
      pageBlocker.close();
    }

    pageBlocker.classList.remove('is-success', 'is-error');
    blockerStatusNode.textContent = message || '';

    if (type) {
      pageBlocker.classList.add(type === 'error' ? 'is-error' : 'is-success');
    }

    if (blockerSpinner) {
      blockerSpinner.hidden = !showSpinner;
    }
  }

  function setFieldError(field, message) {
    var node = form.querySelector('[data-error-for="' + field + '"]');

    if (node) {
      node.textContent = message;
    }
  }

  function clearCloseTimer() {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
  }

  function scheduleModalClose() {
    clearCloseTimer();
    shouldReloadOnClose = true;
    closeTimer = window.setTimeout(function () {
      if (typeof modal.close === 'function' && modal.open) {
        modal.close();
      }
    }, 5000);
  }

  function getPayload() {
    var formData = new FormData(form);

    return {
      first_name: String(formData.get('first_name') || '').trim(),
      last_name: String(formData.get('last_name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      phone: String(formData.get('phone') || '').trim()
    };
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearCloseTimer();
    clearErrors();
    setSuccessMessage('');
    setStatus('', null);
    setBlockerState(true, 'Saving profile...', null, true);
    setLoading(true);

    try {
      var response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(getPayload()),
        credentials: 'same-origin'
      });

      var result = await response.json();

      if (!response.ok || !result.success) {
        setBlockerState(false, '', null, false);
        setStatus(result.message || 'Unable to update profile.', 'error');

        if (result.errors) {
          Object.keys(result.errors).forEach(function (field) {
            var messages = result.errors[field];

            if (Array.isArray(messages) && messages.length) {
              setFieldError(field, messages[0]);
            }
          });
        }

        return;
      }

      setBlockerState(false, '', null, false);
      setSuccessMessage(successMessage);
      scheduleModalClose();
    } catch (error) {
      setBlockerState(false, '', null, false);
      setStatus('A network error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  });

  if (modal) {
    modal.addEventListener('close', function () {
      clearCloseTimer();
      setBlockerState(false, '', null, false);

      if (shouldReloadOnClose) {
        shouldReloadOnClose = false;
        window.location.reload();
      }
    });
  }
})();
