import os

DEBUG = True
APPEND_SLASH = True
INSTALLED_APPS = [
  'tourify',
  'gaeunit'
]

MIDDLEWARE_CLASSES = [
    'django.middleware.common.CommonMiddleware',
    'django.middleware.http.ConditionalGetMiddleware',
]

DEBUG_SESSIONS = False
SITE_WIDE_USERNAME_AND_PASSWORD_URL_EXCEPTIONS = [ r'^/admin/taskqueue/.*$' ]
ROOT_URLCONF = 'urls'

TEMPLATE_CONTEXT_PROCESSORS = [
 'tourify.context.api_keys',
 'tourify.context.appengine_user'
]

TEMPLATE_DEBUG = DEBUG
TEMPLATE_DIRS = [os.path.join(os.path.dirname(__file__), 'templates')]
TEMPLATE_LOADERS = ['django.template.loaders.filesystem.load_template_source']

FILE_UPLOAD_HANDLERS = ['django.core.files.uploadhandler.MemoryFileUploadHandler']
SERIALIZATION_SECRET_KEY = '\xcfB\xf8\xb9\xc4\xe4\xfa\x07\x8atE\xdc\xec\xf9zaR\xa4\x13\x48'

LOGIN_URL = "/login/"

REDIRECT_FIELD_NAME = "redirect_url"

#change this in local_settings.py for your domain
GOOGLE_API_KEY='ABQIAAAA_KNcKfoyaTskjEp-kSSEjxT2yXp_ZAY8_ufC3CFXhHIE1NvwkxTH_3EYVd1BjKueNlU-SnbaMI7UAg'

ADMINS = ["your_email_in_local_settings"]

try:
  from local_settings import *
except ImportError, exp:
  pass
