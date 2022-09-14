FROM solr:8

ADD --chown=solr:solr joblisting /var/solr/data/joblisting

USER root

RUN chown -R solr:solr /var/solr/data/joblisting

USER solr

RUN /opt/solr/bin/solr start
#    /opt/solr/bin/solr create -c joblisting -d /var/solr/data/joblisting

# RUN solrize import http://localhost:8983 -i /bin/samples.txt -c joblisting