
package org.springframework.samples.petclinic.system

import org.springframework.boot.autoconfigure.cache.JCacheManagerCustomizer
import org.springframework.cache.annotation.EnableCaching
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

import javax.cache.configuration.MutableConfiguration

@Configuration(proxyBeanMethods = false)
@EnableCaching
open class CacheConfiguration {

    @Bean
    fun petclinicCacheConfigurationCustomizer(): JCacheManagerCustomizer =
        JCacheManagerCustomizer { cm ->
            cm.createCache("vets", cacheConfiguration())
        }

    private fun cacheConfiguration(): javax.cache.configuration.Configuration<Any, Any> =
        MutableConfiguration<Any, Any>().setStatisticsEnabled(true)
}
