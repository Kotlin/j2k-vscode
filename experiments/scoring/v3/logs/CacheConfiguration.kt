package org.springframework.samples.petclinic.system

import org.springframework.boot.autoconfigure.cache.JCacheManagerCustomizer
import org.springframework.cache.annotation.EnableCaching
import javax.cache.configuration.*
import kotlin.jvm.*

/**
 * Cache configuration intended for caches providing the JCache API. This configuration
 * creates the used cache for the application and enables statistics that become
 * accessible via JMX.
 */
@Configuration(proxyBeanMethods = false)
@EnableCaching
class CacheConfiguration {

    @Bean
    fun petclinicCacheConfigurationCustomizer(): JCacheManagerCustomizer {
        return { cm ->
            val config = MutableConfiguration().apply { setStatisticsEnabled(true) }
            cm.createCache("vets", config as Configuration<Any?, Any?>)
        }
    }

    /**
     * Creates a simple configuration that enable statistics via the JCache programmatic
     * API.
     */
    private fun cacheConfiguration(): Configuration<*, *> {
        return MutableConfiguration().apply { setStatisticsEnabled(true) }
    }
}