FROM openjdk:17-oracle
# Install fontconfig and liberation fonts using microdnf
RUN microdnf install -y fontconfig liberation-fonts && \
    microdnf clean all && \
    fc-cache -f -v \

VOLUME /tmp
COPY target/*.jar app.jar
ENTRYPOINT ["java","-jar","app.jar"]
