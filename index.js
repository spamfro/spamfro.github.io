//----------------------------------------------------------------------------------------
window.addEventListener('load', () => { window.app = new App(new Config()) })

//----------------------------------------------------------------------------------------
class App {
  constructor(config) {
    this.services = new Services(config.services);

    this.ui = new Ui(document.body);
    this.ui.addEventListener('ui:sign-in', () => { this.signIn() });
  }

  signIn() {
    // TODO:
    this.services.googleApi.loadClient()
      .then(() => {
        const prompt = this.services.googleApi.isAuthenticated() ? '' : 'consent';
        return this.services.googleIdentityService.authenticateWithImplicitGrant({ prompt });
      })
      .then(() => {
        return this.services.googleMail.requestLabels();
      })
      .then(labels => {
        this.ui.render({ labels });
      });
  }
}

//----------------------------------------------------------------------------------------
class UiElement {
  constructor(sel, parent) {
    this.el = sel instanceof HTMLElement ? sel : (parent || document).querySelector(sel);
    this.addEventListener = this.el.addEventListener.bind(this.el);
    this.dispatchEvent = this.el.dispatchEvent.bind(this.el);
  }
  toggleClass(classNames, cond) {
    const list = this.el.classList;
    (cond ? list.add : list.remove).apply(list, classNames);
  }
}

class Ui extends UiElement {
  constructor(sel, parent) {
    super(sel, parent);

    this.btnSignIn = new UiElement('.btn-sign-in');
    this.btnSignIn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('ui:sign-in'));
    });

    this.listLabels = new UiLabels('.list-labels');
  }
  render({ labels } = {}) {
    if (labels) { this.listLabels.render(labels) }
  }
}

class UiLabels extends UiElement {
  render(labels = []) {
    this.el.querySelectorAll(':scope > li').forEach(li => { li.remove() });
    labels.forEach(label => {
      new UiLabelItem(this.el.appendChild(UiLabelItem.createElement()))
        .render(label);
    });
  }
}

class UiLabelItem extends UiElement {
  static createElement() {
    return document.createElement('li');
  }
  render({ name } = {}) {
    this.el.textContent = (name || '').toString();
  }
}

//----------------------------------------------------------------------------------------
class Config {
  constructor() {
    this.services = {
      google: {
        apiKey: 'AIzaSyDxgR1btNNMWdaOr0S1Q-F6hpw-jCnCbrU',
        clientId: '588879659786-96ialt5l1bn240naa55eh7gberlo66ds.apps.googleusercontent.com',
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'],
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
      }
    };
  }
}

//----------------------------------------------------------------------------------------
class Services {
  constructor(config) {
    this.googleApi = new GoogleAPI(config.google);
    this.googleIdentityService = new GoogleIdentityService(config.google);
    this.googleMail = new GoogleMail(this.googleApi);
  }
}

class GoogleMail {
  constructor(googleApi) {
    this.googleApi = googleApi;
  }
  requestLabels() {
    return new Promise((resolve, reject) => {
      this.googleApi.client.gmail.users.labels.list({ userId: 'me' })
        .then(({ result: { labels } }) => { resolve(labels) }, reject);
    });
  }
}

class GoogleAPI {
  constructor(config) {
    this.config = config;
  }
  isAuthenticated() {
    return this.client.getToken() !== null;
  }
  loadClient() {
    return new Promise((resolve, reject) => {
      gapi.load('client', () => {
        const { apiKey, discoveryDocs } = this.config;
        gapi.client.init({ apiKey, discoveryDocs })
          .then(() => {
            this.client = gapi.client;
            resolve();
          }, reject);
      });
    });
  }
}

class GoogleIdentityService {
  constructor(config) {
    this.config = config;
  }
  authenticateWithImplicitGrant({ prompt }) {
    const { clientId, scope } = this.config;
    return new Promise((resolve) => {
      this.tokenClient = google.accounts.oauth2.initTokenClient({  // OAuth 2 implicit grant
        callback: resolve,
        client_id: clientId,
        scope,
      });
      this.tokenClient.requestAccessToken({ prompt });
    });
  }
}