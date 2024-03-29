#Copyright 2010 Google Inc.
#
#Licensed under the Apache License, Version 2.0 (the "License");
#you may not use this file except in compliance with the License.
#You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
#Unless required by applicable law or agreed to in writing, software
#distributed under the License is distributed on an "AS IS" BASIS,
#WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#See the License for the specific language governing permissions and
#limitations under the License.
from django.conf.urls.defaults import *
from views import *

urlpatterns = patterns('')

urlpatterns += patterns(
    url(r'^/$', index, name='home'),
    url(r'^$', index, name='home'),
    url(r'^advanced/$', index, {'template':'advanced.html'}, name='advanced'),
    url(r'^simple/$', index, {'template':'simple.html'}, name='simple'),
    url(r'^tours/create/$', create, name='create'), #for POSTing a new tour
    url(r'^tours/recent/$', recent, name='recent'),
    url(r'^tours/(?P<shorturl>[a-zA-Z0-9-_]+)/$', shorturl, name='shorturl'),
    url(r'^tours/(?P<shorturl>[a-zA-Z0-9-_]+)/embed/$', shorturl, {'embed':True}, name='embed'),
)
