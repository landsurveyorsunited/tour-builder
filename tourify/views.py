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
import time
import logging

from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.conf import settings

from google.appengine.ext import db
from google.appengine.api import memcache
from google.appengine.api import users

from models import *

import simplejson
from StringIO import StringIO
import csv

LOOKAT_ATTRS = ['lat','lng','alt','tilt','heading','rng','flyto','pause','title','description']
TOUR_ATTRS = ['title','advanced','roads','borders','buildings','spin']

def index(request, template=''):
  if not template:
    return render_to_response('index.html', RequestContext(request,{}))
  return render_to_response(template, RequestContext(request,{}))

def create(request):
  tour = request.POST.get('tour','');
  if not tour:
    return 404
  json = simplejson.loads(tour)
  lookats = json['lookats']

  t = Tour()
  for l in lookats:
    la = LookAt()
    for each in LOOKAT_ATTRS:
      #move integers to float
      if not l.has_key(each):
        logging.debug('no %s attribute' % each)
        continue
      if type(l[each]) == int:
        l[each] = l[each] * 1.0
      setattr(la, each, l[each])
    l_key = la.put()
    t.lookats.append(la.key())


  for each in TOUR_ATTRS:
    if json.has_key(each):
      setattr(t, each, json[each])
    else:
      logging.debug('no tour key for %s' % each)
  t_key = t.put()
  logging.info(t_key)

  return render_to_response('arbitrary.json', RequestContext(request,{
    'json': simplejson.dumps({
       'tour' : str(t_key)})
     }))
  #return HttpResponseRedirect('/tour/' + t_key, RequestContext(request,{'tour':t}))


def maplink(request, shorturl):
  tour = Tour.get_by_key_name(shorturl)
  if not tour:
    return render_to_response('index.html', RequestContext(request,{}))
  return render_to_response('maplink.json', RequestContext(request,{'tour':tour}))

def shorturl(request, shorturl, embed=False):
  tour = db.get(shorturl)
  if not tour:
    raise Exception('tour not found: %s' % shorturl)
  if embed:
    template = 'embed.html'
  else:
    template = 'tour.html'
  return render_to_response(template, RequestContext(request,{
        'host' : request.get_host(),
        'tour' : tour}))

#list of recent tours
def recent(request):
  tours = Tour.all().order('-created')[:5]
  return render_to_response('recent.html', RequestContext(request,{'tours':tours}))
