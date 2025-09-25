-- MySQL dump 10.13  Distrib 8.0.19, for Win64 (x86_64)
--
-- Host: localhost    Database: mydb
-- ------------------------------------------------------
-- Server version	8.4.5

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `tariff_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `timestamp` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`payment_id`),
  KEY `payments_users_FK` (`user_id`),
  KEY `payments_tariffs_FK` (`tariff_id`),
  CONSTRAINT `payments_tariffs_FK` FOREIGN KEY (`tariff_id`) REFERENCES `tariffs` (`tariff_id`),
  CONSTRAINT `payments_users_FK` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptions` (
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `is_auto_renewal` tinyint(1) NOT NULL,
  `start_date` datetime NOT NULL,
  `expiration_date` datetime NOT NULL,
  `id` char(36) NOT NULL,
  `last_paid_tariff_id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `subscriptions_tariffs_FK` (`last_paid_tariff_id`),
  KEY `subscriptions_users_FK` (`user_id`),
  CONSTRAINT `subscriptions_tariffs_FK` FOREIGN KEY (`last_paid_tariff_id`) REFERENCES `tariffs` (`tariff_id`),
  CONSTRAINT `subscriptions_users_FK` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptions`
--

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
INSERT INTO `subscriptions` VALUES ('846f24bc-5c26-45d4-bf37-3eb53432b997',0,'2025-09-10 22:29:05','2026-07-10 22:29:05','18c7390e-d345-440a-833c-e709fce74238','2'),('846f24bc-5c26-45d4-bf37-3eb53432b997',0,'2025-09-01 00:00:00','2025-09-09 00:00:00','846f24bc-5c26-45d4-bf37-3eb53432b800','2'),('48bb5685-b290-48c8-b25d-1bfb913e4610',0,'2025-09-15 11:04:32','2025-11-15 11:04:32','c42ba14b-5f16-4230-819a-3217be20fd15','2');
/*!40000 ALTER TABLE `subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tariffs`
--

DROP TABLE IF EXISTS `tariffs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tariffs` (
  `tariff_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `duration` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`tariff_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tariffs`
--

LOCK TABLES `tariffs` WRITE;
/*!40000 ALTER TABLE `tariffs` DISABLE KEYS */;
INSERT INTO `tariffs` VALUES ('1','Тариф 1',1,100.00),('2','Тариф 2',2,500.00),('3','Тариф 3',1,500.00),('4','Тариф 4',2,500.00);
/*!40000 ALTER TABLE `tariffs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_requests`
--

DROP TABLE IF EXISTS `user_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_requests` (
  `user_id` char(36) NOT NULL,
  `current_count` int NOT NULL DEFAULT '0',
  `last_request` datetime DEFAULT CURRENT_TIMESTAMP,
  `total_count` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_requests_users_FK` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_requests`
--

LOCK TABLES `user_requests` WRITE;
/*!40000 ALTER TABLE `user_requests` DISABLE KEYS */;
INSERT INTO `user_requests` VALUES ('48bb5685-b290-48c8-b25d-1bfb913e4610',0,NULL,0);
/*!40000 ALTER TABLE `user_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `login` varchar(100) NOT NULL,
  `password_hash` varchar(100) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `registration_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `users_unique` (`login`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('48bb5685-b290-48c8-b25d-1bfb913e4610','lily.smirn.design@gmail.com','$2b$10$pOOrdV68VAM1Nc9HCMYw2eILXES26.tTFqite.1vBs9tyy7dWu/R2','Lilia Smirnova','2025-09-15 07:02:26'),('62f39af1-7d10-4649-a786-194e71d85313','1212@1212.rt','$2b$10$ULgxuKvRwBWBO5nGCK4nD.bXKaog2wc3Fr/rUgGw6YONszZHCBHCa','1212','2025-09-03 07:49:00'),('691cd12b-6e45-4f6d-816f-a7b10c616b25','123@234.qq','$2b$10$y.BdYhzFOQ4wk0sGPuQqpO0Pb3puSf/vMEOQuJDFpiYiFSlXT8Yg.','Lilia Smirnova','2025-09-03 07:45:12'),('6e871ab8-0ad2-4fb4-852a-2d7df29b6330','pochta333@pochta.ru','$2b$10$UGFlZH6k2IIR41eDkw/mt.m1ppu.A4t0d83r3kfys9Yhln0meVdqy','123','2025-08-06 06:22:26'),('70656353-fff6-40b5-8bc5-dee44dc8788d','Lily','$2b$10$4AwLNLH6.ajwuoGqGJXHwuW5geiTkq/5pF3MRqpMLcHaBwL2uDDjq',' undefined','2025-07-24 14:08:15'),('71fae88d-ce34-4ac9-bdaa-a786bbdfdb99','test2@example.com','$2b$10$xCRNc01v/cH6e8C2pCEoteu4Tvl59YmkrNMfKPaJjPhHijehfQoze','Lily LilyLily','2025-07-24 16:12:07'),('7c11014a-b08d-43d9-a9af-e741cd91f99f','pochta3@pochta.ru','$2b$10$OXZbgTZgcpR9kxZL25vtseBBXW.QOxPYiwspTW/ChuY49e8WOhMl6','123','2025-08-04 11:22:40'),('7c17d7fe-9f9e-4b75-b20c-914acceb3ae4','egorsmirn@outlook.com','123','Egor Smirnov','2025-07-23 16:08:52'),('846f24bc-5c26-45d4-bf37-3eb53432b997','mrs.esmirn@gmail.com','$2b$10$BIOB2xeRbRPZqo.BfdR/qeJUBM94IQ4Cr2ZaZgj52I0xQ7aWnqDsS','Lilia Smirnova','2025-09-03 08:52:20'),('9493a5e3-13a4-466b-a91f-930fa3a6f20f','sdsdfgdfg@pochta.ru','$2b$10$VELMeqP7Vj7S2x9ggHyaTucQE3dmtGE5Dg9hfK5n9In0OkbE2NRn.','987','2025-07-28 12:47:09'),('d09daa52-67e1-11f0-ba59-0242ac110002','JD','123','John Doe','2025-07-23 16:26:41'),('f31aa713-5627-42d0-a2b0-3829c59a9b49','pochta@pochta.ru','$2b$10$2/sidbKVa6mYLpTpHPcG5eBv94rfTIUZNNajzKDKYE1L4advzr/jW','12345','2025-08-04 11:22:07');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'mydb'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-22 10:19:48
