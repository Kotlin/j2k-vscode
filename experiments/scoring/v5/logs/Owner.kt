
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
package org.springframework.samples.petclinic.owner

import org.springframework.core.style.ToStringCreator
import org.springframework.samples.petclinic.model.Person
import org.springframework.util.Assert

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.OneToMany
import jakarta.persistence.OrderBy
import jakarta.persistence.Table
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.NotBlank

@Entity
@Table(name = "owners")
open class Owner : Person() {

    @field:Column(name = "address")
    @field:NotBlank
    var address: String = ""

    @field:Column(name = "city")
    @field:NotBlank
    var city: String = ""

    @field:Column(name = "telephone")
    @field:NotBlank
    @field:Pattern(regexp = "\\d{10}", message = "{telephone.invalid}")
    var telephone: String = ""

    @field:OneToMany(cascade = [CascadeType.ALL], fetch = FetchType.EAGER)
    @field:JoinColumn(name = "owner_id")
    @field:OrderBy("name")
    val pets: MutableList<Pet> = mutableListOf()

    fun addPet(pet: Pet) {
        if (pet.isNew()) {
            pets.add(pet)
        }
    }

    fun getPet(name: String): Pet? = getPet(name, false)

    fun getPet(id: Int): Pet? =
        pets.firstOrNull { !it.isNew() && it.getId() == id }

    fun getPet(name: String, ignoreNew: Boolean): Pet? =
        pets.firstOrNull { it.getName()?.equals(name, ignoreCase = true) == true && (!ignoreNew || !it.isNew()) }

    override fun toString(): String {
        return ToStringCreator(this)
            .append("id", this.getId())
            .append("new", this.isNew())
            .append("lastName", this.getLastName())
            .append("firstName", this.getFirstName())
            .append("address", this.address)
            .append("city", this.city)
            .append("telephone", this.telephone)
            .toString()
    }

    fun addVisit(petId: Int, visit: Visit) {
        val pet = getPet(petId)
        requireNotNull(pet) { "Invalid Pet identifier!" }
        pet.addVisit(visit)
    }
}
