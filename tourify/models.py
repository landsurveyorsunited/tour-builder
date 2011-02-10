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
import re
import logging
from google.appengine.ext import db
from google.appengine.api import users
from google.appengine.api import memcache
from django.core.urlresolvers import reverse
import simplejson

class LookAt(db.Model):
  lat = db.FloatProperty()
  lng = db.FloatProperty()
  alt = db.FloatProperty()
  tilt = db.FloatProperty()
  heading = db.FloatProperty()
  rng = db.FloatProperty()
  flyto = db.FloatProperty()
  pause = db.FloatProperty()
  #title = db.StringProperty()
  #description = db.StringProperty()

class Tour(db.Model):
  title = db.StringProperty()
  lookats = db.ListProperty(db.Key)
  advanced = db.BooleanProperty(default=False)
  roads = db.BooleanProperty(default=False)
  borders = db.BooleanProperty(default=False)
  buildings = db.BooleanProperty(default=False)
  spin = db.BooleanProperty(default=False)
  created = db.DateTimeProperty(auto_now = True)

  def toJson(self):
    js = {}
    js['created'] = self.created.strftime("%Y-%m-%d")
    js['key'] = str(self.key())
    for each in ['title','advanced','roads','borders','buildings','spin']:
      js[each] = getattr(self,each)
    js['lookats'] = []
    for l in self.lookats:
      js['lookats'].append(db.get(l).__dict__['_entity'])
    return simplejson.dumps(js)

  def get_lookats(self):
    return [db.get(l) for l in self.lookats]
