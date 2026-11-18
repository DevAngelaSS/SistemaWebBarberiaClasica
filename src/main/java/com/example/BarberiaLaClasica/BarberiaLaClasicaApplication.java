package com.example.BarberiaLaClasica;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import io.github.cdimascio.dotenv.Dotenv;

@SpringBootApplication
public class BarberiaLaClasicaApplication {
    public static void main(String[] args) {
        System.out.println(">>> Directorio actual: " + System.getProperty("user.dir"));

        Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
        dotenv.entries().forEach(e -> System.setProperty(e.getKey(), e.getValue()));

        System.out.println(">>> DB_URL cargado: " + System.getProperty("DB_URL"));

        SpringApplication.run(BarberiaLaClasicaApplication.class, args);
    }
}