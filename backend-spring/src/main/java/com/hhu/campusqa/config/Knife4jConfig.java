package com.hhu.campusqa.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Knife4j / Swagger API 文档配置
 * <p>
 * 启动后访问：<a href="http://localhost:8000/doc.html">http://localhost:8000/doc.html</a>
 * </p>
 */
@Configuration
public class Knife4jConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("校园问答助手 API")
                        .description("河海大学校园知识库问答系统接口文档")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Campus QA Team")));
    }
}
