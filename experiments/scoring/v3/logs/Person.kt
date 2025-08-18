/*
 * Copyright 2012-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.springframework.samples.petclinic.model

import jakarta.persistence.Column
import jakarta.persistence.MappedSuperclass
import jakarta.validation.constraints.NotBlank
import org.springframework.samples.petclinic.model.BaseEntity

/**
 * Simple JavaBean domain object representing an person.
 *
 * @author Ken Krebs
 */
@MappedSuperclass
open class Person : BaseEntity() {

    // Convert the field to a property with annotations preserved
    @field:NotBlank
    @field:Column(name = "first_name")
    protected open var firstName: String? by Delegates.notNull()

    // Similarly for lastName, but note we are only converting getLastName method.
    // In Kotlin, properties automatically provide getters and setters.

}